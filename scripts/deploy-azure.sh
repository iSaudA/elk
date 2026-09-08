#!/usr/bin/env bash
# Purpose: update application files on the existing Azure VM after initial provisioning.
# Project choice: a public GitHub source archive keeps the course deployment small.
# This helper assumes trusted repository/revision inputs and a public repository.
# Reference: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/run-command
set -euo pipefail

repository=${1:?usage: deploy-azure.sh OWNER/REPO REVISION RESOURCE_GROUP VM_NAME}
revision=${2:?revision is required}
resource_group=${3:?resource group is required}
vm_name=${4:?VM name is required}
archive_url="https://github.com/${repository}/archive/${revision}.tar.gz"

# Escaped dollar signs are evaluated on the Azure VM, rather than this shell.
# Existing .env credentials remain on the VM because they are excluded from Git.
remote_script="set -e
work=\$(mktemp -d)
curl -fsSL '${archive_url}' -o \"\$work/source.tar.gz\"
tar -xzf \"\$work/source.tar.gz\" -C \"\$work\"
source_dir=\$(find \"\$work\" -mindepth 1 -maxdepth 1 -type d | head -n1)
if [ -f \"\$source_dir/replica-shop/compose.azure.yaml\" ]; then source_dir=\"\$source_dir/replica-shop\"; fi
cp -a \"\$source_dir/.\" /opt/ayn-al-sijill/
cd /opt/ayn-al-sijill
docker compose -f compose.azure.yaml up -d --build --remove-orphans
rm -rf \"\$work\""

"$(dirname "$0")/run-remote.sh" "$resource_group" "$vm_name" "$remote_script"

echo "Revision $revision deployed to $vm_name."
