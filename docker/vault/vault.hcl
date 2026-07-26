# HashiCorp Vault — configuration serveur (socle Swarm, à durcir avant prod).
#
# ⚠️ APRÈS LE PREMIER DÉMARRAGE (une seule fois) :
#   1. vault operator init         -> conserver les clés de descellement + root token HORS ligne
#   2. vault operator unseal        (x3, ou configurer un auto-unseal via KMS/Transit)
#   3. vault secrets enable -path=secret kv-v2
#   4. vault kv put secret/immoguinee/app \
#        jwt_secret=<...> evolution_api_key=<...> s3_access_key=<...> s3_secret_key=<...>
#   5. vault auth enable approle ; créer le role "immog-backend" avec une policy
#      en lecture sur secret/data/immoguinee/app ; injecter role_id (env) + secret_id
#      (Docker secret vault_approle_secret_id) dans le service backend.
#
# Recommandé en prod : auto-unseal (transit/awskms), TLS sur le listener,
# audit device, et raft en HA (3 nœuds).

ui = true
disable_mlock = false

storage "raft" {
  path    = "/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  # Le réseau overlay 'data' est chiffré (IPSec). Pour un zéro-trust strict,
  # activer TLS ici (tls_cert_file / tls_key_file) et passer IMMOG_VAULT_ADDR en https.
  tls_disable = true
}

api_addr     = "http://vault:8200"
cluster_addr = "http://vault:8201"
