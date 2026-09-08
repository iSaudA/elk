#!/usr/bin/env bash
# Purpose: prepare the Azure Ubuntu VM on first boot, then start Compose.
# Run through cloud-init as root; this is not a workstation setup script.
# Reference: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
# Docker installation follows its signed Ubuntu package repository:
# Reference: https://docs.docker.com/engine/install/ubuntu/
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg jq rsync rsyslog

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Signed-By: /etc/apt/keyrings/docker.gpg
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Elasticsearch maps index files into memory; this raises the Linux mapping limit.
# Reference: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/vm-max-map-count
cat >/etc/sysctl.d/99-elasticsearch.conf <<EOF
vm.max_map_count=1048576
EOF
sysctl --system >/dev/null

# Filebeat reads JSON container logs. Rotate them so traffic cannot fill the disk.
# Our 10 MB / 3-file cap is a demo retention choice, separate from Elasticsearch ILM.
# Reference: https://docs.docker.com/engine/logging/drivers/json-file/
cat >/etc/docker/daemon.json <<'DOCKER'
{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}
DOCKER
systemctl restart docker

# Enable services at boot so the 09:00 VM start also brings Docker back.
# This script manages a fresh demo host and replaces its Docker daemon configuration.
systemctl enable --now rsyslog
systemctl enable --now docker
if id azureuser >/dev/null 2>&1; then
  usermod -aG docker azureuser
fi

if [[ -f /opt/ayn-al-sijill/compose.azure.yaml ]]; then
  cd /opt/ayn-al-sijill
  docker compose -f compose.azure.yaml pull
  docker compose -f compose.azure.yaml up -d --build
fi
