#!/bin/bash
cd ~/effetto-composto
sed -i '/CRON_SECRET/d' .env
SECRET=$(openssl rand -base64 32)
echo "CRON_SECRET=$SECRET" >> .env
echo "=== .env aggiornato ==="
cat .env
