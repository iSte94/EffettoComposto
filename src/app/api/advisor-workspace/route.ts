import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    getAdvisorScenarioName,
    parseAdvisorReminders,
    parseAdvisorSavedScenarios,
    removeAdvisorScenario,
    upsertAdvisorScenario,
} from "@/lib/advisor-workspace";
import {
    advisorWorkspaceActionSchema,
} from "@/lib/validations/advisor-workspace";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import type { AdvisorReminder, AdvisorSavedScenario } from "@/types";
import { z } from "zod";

function sortReminders(reminders: AdvisorReminder[]): AdvisorReminder[] {
    return [...reminders].sort((a, b) => (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
}

async function loadWorkspaceState(userId: string) {
    const preference = await prisma.preference.findUnique({
        where: { userId },
        select: {
            advisorSavedScenarios: true,
            advisorReminders: true,
            acceptedPurchases: true,
        },
    });

    return {
        savedScenarios: parseAdvisorSavedScenarios(preference?.advisorSavedScenarios, preference?.acceptedPurchases),
        reminders: parseAdvisorReminders(preference?.advisorReminders),
    };
}

async function persistWorkspaceState(userId: string, savedScenarios: AdvisorSavedScenario[], reminders: AdvisorReminder[]) {
    await prisma.preference.upsert({
        where: { userId },
        update: {
            advisorSavedScenarios: JSON.stringify(savedScenarios),
            advisorReminders: JSON.stringify(reminders),
        },
        create: {
            userId,
            advisorSavedScenarios: JSON.stringify(savedScenarios),
            advisorReminders: JSON.stringify(reminders),
        },
    });
}

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const workspace = await loadWorkspaceState(userId);
        return NextResponse.json(workspace);
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to load advisor workspace:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawBody = await req.json();
        const action = advisorWorkspaceActionSchema.parse(rawBody);
        const now = new Date().toISOString();
        const workspace = await loadWorkspaceState(userId);

        switch (action.action) {
            case "upsert_scenario": {
                const result = upsertAdvisorScenario(workspace.savedScenarios, action.scenario, { now });
                await persistWorkspaceState(userId, result.scenarios, workspace.reminders);
                return NextResponse.json({
                    savedScenario: result.scenario,
                    savedScenarios: result.scenarios,
                    reminders: workspace.reminders,
                });
            }

            case "toggle_shortlist": {
                const existing = workspace.savedScenarios.find((scenario) => scenario.fingerprint === action.fingerprint);
                if (!existing && !action.scenario) {
                    return NextResponse.json({ error: "Scenario non trovato" }, { status: 404 });
                }

                const baseScenario = action.scenario ?? {
                    simulation: existing!.simulation,
                    summary: existing!.summary,
                    note: existing!.note ?? null,
                    isShortlisted: existing!.isShortlisted,
                    linkedGoalId: existing!.linkedGoalId ?? null,
                };
                const desiredShortlist = action.desired ?? !existing?.isShortlisted;
                const result = upsertAdvisorScenario(workspace.savedScenarios, baseScenario, {
                    now,
                    desiredShortlist,
                    linkedGoalId: baseScenario.linkedGoalId ?? null,
                });

                await persistWorkspaceState(userId, result.scenarios, workspace.reminders);
                return NextResponse.json({
                    savedScenario: result.scenario,
                    savedScenarios: result.scenarios,
                    reminders: workspace.reminders,
                });
            }

            case "create_plan": {
                const goal = await prisma.savingsGoal.create({
                    data: {
                        ...action.goal,
                        deadline: action.goal.deadline ?? null,
                        userId,
                    },
                });

                const result = upsertAdvisorScenario(workspace.savedScenarios, action.scenario, {
                    now,
                    linkedGoalId: goal.id,
                });

                await persistWorkspaceState(userId, result.scenarios, workspace.reminders);
                return NextResponse.json({
                    goal,
                    savedScenario: result.scenario,
                    savedScenarios: result.scenarios,
                    reminders: workspace.reminders,
                });
            }

            case "create_reminder": {
                const result = upsertAdvisorScenario(workspace.savedScenarios, action.scenario, { now });
                const reminder: AdvisorReminder = {
                    id: `advisor-reminder-${crypto.randomUUID()}`,
                    createdAt: now,
                    updatedAt: now,
                    scenarioId: result.scenario.id,
                    scenarioFingerprint: result.scenario.fingerprint,
                    itemName: getAdvisorScenarioName(result.scenario.simulation),
                    category: result.scenario.simulation.category,
                    triggerType: action.reminder.triggerType,
                    reminderAt: action.reminder.reminderAt ?? null,
                    targetEmergencyMonths: action.reminder.targetEmergencyMonths ?? null,
                    note: action.reminder.note ?? null,
                };
                const reminders = sortReminders([reminder, ...workspace.reminders]);

                await persistWorkspaceState(userId, result.scenarios, reminders);
                return NextResponse.json({
                    reminder,
                    savedScenario: result.scenario,
                    savedScenarios: result.scenarios,
                    reminders,
                });
            }

            case "delete_scenario": {
                const updated = removeAdvisorScenario(workspace.savedScenarios, workspace.reminders, action.id);
                await persistWorkspaceState(userId, updated.scenarios, updated.reminders);
                return NextResponse.json({
                    savedScenarios: updated.scenarios,
                    reminders: updated.reminders,
                });
            }

            case "delete_reminder": {
                const reminders = sortReminders(
                    workspace.reminders.filter((reminder) => reminder.id !== action.id),
                );
                await persistWorkspaceState(userId, workspace.savedScenarios, reminders);
                return NextResponse.json({
                    savedScenarios: workspace.savedScenarios,
                    reminders,
                });
            }

            default: {
                return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
            }
        }
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message ?? "Dati non validi" },
                { status: 400 },
            );
        }

        console.error("Failed to save advisor workspace:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500 });
    }
}
