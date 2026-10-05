.PHONY: format validate
format:
	terraform -chdir=terraform fmt -recursive
validate:
	docker compose --env-file .env.example -f compose.azure.yaml config --quiet
	terraform -chdir=terraform validate
