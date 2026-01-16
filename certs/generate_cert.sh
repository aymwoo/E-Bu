#!/bin/bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt -subj "/C=CN/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
echo "Certificate generated in certs/server.crt and certs/server.key"
