vcl 4.1;

# Backend definition (Nginx) - Use Docker Swarm service VIP
backend default {
    .host = "immog_nginx";
    .port = "80";
    .connect_timeout = 5s;
    .first_byte_timeout = 60s;
    .between_bytes_timeout = 10s;
}

# Access Control List for cache purging
acl purge {
    "localhost";
    "127.0.0.1";
    "::1";
    "immog_nginx";
    "10.0.0.0"/8;
}

sub vcl_recv {
    # Remove all cookies for static files
    if (req.url ~ "^/(images|css|js|fonts|uploads)/") {
        unset req.http.Cookie;
    }

    # Do not cache admin area
    if (req.url ~ "^/admin" || req.url ~ "^/api/admin") {
        return (pass);
    }

    # Do not cache authenticated requests
    if (req.http.Authorization || req.http.Cookie ~ "laravel_session") {
        return (pass);
    }

    # Allow cache purging from authorized IPs
    if (req.method == "PURGE") {
        if (!client.ip ~ purge) {
            return (synth(405, "Purge not allowed"));
        }
        return (purge);
    }

    # Only cache GET and HEAD requests
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }

    # Strip query strings for static files
    if (req.url ~ "\.(jpg|jpeg|png|gif|webp|ico|svg|css|js|woff|woff2|ttf|eot)$") {
        set req.url = regsub(req.url, "\?.*$", "");
    }

    return (hash);
}

sub vcl_backend_response {
    # Cache static files for 1 week
    if (bereq.url ~ "\.(jpg|jpeg|png|gif|webp|ico|svg|css|js|woff|woff2|ttf|eot)$") {
        set beresp.ttl = 7d;
        set beresp.http.Cache-Control = "public, max-age=604800";
        unset beresp.http.Set-Cookie;
    }

    # Cache API listing search for 5 minutes (FR-094)
    if (bereq.url ~ "^/api/listings/search" && bereq.method == "GET") {
        set beresp.ttl = 5m;
        set beresp.http.Cache-Control = "public, max-age=300";
    }

    # Don't cache 5xx errors
    if (beresp.status >= 500) {
        set beresp.uncacheable = true;
        return (deliver);
    }

    # Don't cache if Set-Cookie is present
    if (beresp.http.Set-Cookie) {
        set beresp.uncacheable = true;
        return (deliver);
    }

    # Enable ESI (Edge Side Includes) if needed
    if (beresp.http.Surrogate-Control ~ "ESI/1.0") {
        unset beresp.http.Surrogate-Control;
        set beresp.do_esi = true;
    }

    return (deliver);
}

sub vcl_deliver {
    # Add cache hit/miss header for debugging
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }

    # Remove backend server information for security
    unset resp.http.X-Powered-By;
    unset resp.http.Server;
    unset resp.http.X-Varnish;

    return (deliver);
}

sub vcl_hit {
    # Serve stale content if backend is unhealthy (grace mode)
    if (obj.ttl >= 0s) {
        return (deliver);
    }

    if (obj.ttl + 10m > 0s) {
        return (deliver);
    }

    return (restart);
}
