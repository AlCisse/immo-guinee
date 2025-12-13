# Laravel Echo Server

Serveur WebSocket pour le broadcasting temps réel avec Socket.IO.

## Configuration

### laravel-echo-server.json
Configuration du serveur Laravel Echo:

**Paramètres principaux**:
- **Port**: 6001
- **Protocol**: http (ou https en production)
- **Database**: redis
- **Auth endpoint**: http://nginx/broadcasting/auth

**Clients supportés**:
- `socket.io` - Client officiel Socket.IO
- `http` - Polling HTTP

**Database** (Redis):
- Host: redis
- Port: 6379
- Password: depuis env REDIS_PASSWORD

## Fonctionnement

Laravel Echo Server agit comme un pont entre:
1. **Laravel Backend** → Broadcast des événements via Redis
2. **Laravel Echo Server** → Reçoit de Redis, transmet via WebSocket
3. **Frontend** → Écoute les événements en temps réel

## Événements diffusés

### NewMessageEvent
Nouveau message dans une conversation:
```javascript
Echo.private('conversation.123')
    .listen('NewMessageEvent', (e) => {
        console.log('Nouveau message:', e.message);
    });
```

### PaymentStatusUpdated
Statut de paiement modifié:
```javascript
Echo.private('user.456')
    .listen('PaymentStatusUpdated', (e) => {
        console.log('Paiement:', e.payment.statut);
    });
```

### ContractStatusUpdated
Statut de contrat modifié:
```javascript
Echo.private('contract.789')
    .listen('ContractStatusUpdated', (e) => {
        console.log('Contrat:', e.contract.statut);
    });
```

## Utilisation Frontend

### Installation
```bash
npm install --save laravel-echo socket.io-client
```

### Configuration (Next.js)
```typescript
// lib/socket/echo.ts
import Echo from 'laravel-echo';
import io from 'socket.io-client';

window.io = io;

export const echo = new Echo({
    broadcaster: 'socket.io',
    host: window.location.hostname + ':6001',
    auth: {
        headers: {
            Authorization: `Bearer ${getAccessToken()}`,
        },
    },
});
```

### Écouter un canal privé
```typescript
// components/Chat.tsx
import { echo } from '@/lib/socket/echo';
import { useEffect } from 'react';

export function Chat({ conversationId }) {
    useEffect(() => {
        const channel = echo.private(`conversation.${conversationId}`);

        channel.listen('NewMessageEvent', (e) => {
            console.log('Nouveau message:', e.message);
            // Ajouter le message à l'UI
        });

        return () => {
            channel.stopListening('NewMessageEvent');
            echo.leave(`conversation.${conversationId}`);
        };
    }, [conversationId]);

    return <div>Chat component</div>;
}
```

### Écouter un canal de présence
```typescript
// components/OnlineUsers.tsx
const channel = echo.join('online-users');

channel
    .here((users) => {
        console.log('Utilisateurs présents:', users);
    })
    .joining((user) => {
        console.log('Utilisateur connecté:', user);
    })
    .leaving((user) => {
        console.log('Utilisateur déconnecté:', user);
    });
```

## Backend Laravel

### Broadcast des événements
```php
// app/Events/NewMessageEvent.php
namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class NewMessageEvent implements ShouldBroadcast
{
    public function __construct(
        public Message $message
    ) {}

    public function broadcastOn()
    {
        return new PrivateChannel('conversation.' . $this->message->conversation_id);
    }

    public function broadcastWith()
    {
        return [
            'message' => $this->message->load('auteur'),
        ];
    }
}
```

### Déclencher un événement
```php
// Dans un controller
use App\Events\NewMessageEvent;

$message = Message::create([...]);
broadcast(new NewMessageEvent($message))->toOthers();
```

### Authorisation des canaux
```php
// routes/channels.php
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return Conversation::find($conversationId)
        ->participants()
        ->where('user_id', $user->id)
        ->exists();
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
```

## Monitoring

### Vérifier le statut
```bash
# Logs
docker logs immog-laravel-echo -f

# Vérifier que le port est ouvert
curl http://localhost:6001/socket.io/?transport=polling

# Test de connexion
wscat -c ws://localhost:6001/socket.io/?transport=websocket
```

### Statistiques
Laravel Echo Server expose des stats sur:
```
http://localhost:6001/stats
```

Métriques:
- Clients connectés
- Canaux actifs
- Messages envoyés/reçus

## Debug

### Activer le mode debug
```json
{
  "devMode": true,
  "database": "redis",
  "databaseConfig": {
    "redis": {
      "host": "redis",
      "port": "6379"
    }
  }
}
```

### Voir les événements en temps réel
```bash
# Sur le serveur
docker exec immog-laravel-echo cat /var/log/laravel-echo.log

# Depuis Redis
docker exec immog-redis redis-cli -a immog_redis_secret MONITOR
```

### Test manuel
```bash
# Publier un événement depuis Redis
docker exec immog-redis redis-cli -a immog_redis_secret \
  PUBLISH laravel_database_conversation.123 '{"event":"NewMessageEvent","data":{"message":"test"}}'
```

## Performance

### Scalabilité
Pour gérer plus de connexions simultanées:

```yaml
# docker-compose.yml
laravel-echo:
  environment:
    - MAX_CLIENTS=10000
  deploy:
    replicas: 3
```

### Redis Pub/Sub
Laravel Echo utilise Redis Pub/Sub:
- Pas de persistence nécessaire
- Très performant (> 100k messages/sec)
- Pas de limite sur le nombre de subscribers

### Sticky sessions
Si vous scalez Laravel Echo (plusieurs instances), utilisez sticky sessions:

```nginx
# nginx.conf
upstream echo_backend {
    ip_hash;  # Sticky sessions
    server echo1:6001;
    server echo2:6001;
    server echo3:6001;
}
```

## CORS

En production, configurez CORS dans `laravel-echo-server.json`:

```json
{
  "apiOriginAllow": {
    "allowCors": true,
    "allowOrigin": "https://immoguinee.gn",
    "allowMethods": "GET,POST",
    "allowHeaders": "Origin,Content-Type,X-Auth-Token,X-Requested-With,Accept,Authorization,X-CSRF-TOKEN,X-Socket-Id"
  }
}
```

## SSL/TLS

Pour activer HTTPS sur Laravel Echo:

```json
{
  "protocol": "https",
  "sslCertPath": "/etc/ssl/certs/laravel-echo.crt",
  "sslKeyPath": "/etc/ssl/private/laravel-echo.key",
  "sslCertChainPath": "/etc/ssl/certs/ca-chain.crt"
}
```

## Troubleshooting

### Clients ne se connectent pas
```bash
# Vérifier que Redis fonctionne
docker exec immog-redis redis-cli -a immog_redis_secret ping

# Vérifier les logs Echo
docker logs immog-laravel-echo

# Tester l'endpoint d'auth
curl http://localhost/broadcasting/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -X POST
```

### Events non reçus
```bash
# Vérifier que l'event est bien broadcast
# Dans Laravel
Log::info('Broadcasting event', ['event' => $event]);

# Vérifier Redis Pub/Sub
docker exec immog-redis redis-cli -a immog_redis_secret PSUBSCRIBE '*'
```

### 401 Unauthorized
Vérifiez:
- Le token Passport est valide
- L'endpoint `/broadcasting/auth` est accessible
- Le canal est bien autorisé dans `routes/channels.php`

## Production Checklist

- [ ] Désactiver `devMode`
- [ ] Configurer CORS correctement
- [ ] Activer SSL/TLS
- [ ] Configurer sticky sessions si scalé
- [ ] Monitorer les connexions actives
- [ ] Limiter `MAX_CLIENTS` selon la RAM
- [ ] Ajouter des alertes sur les erreurs
