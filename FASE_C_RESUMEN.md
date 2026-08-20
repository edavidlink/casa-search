# FASE C — Configuración del dominio en GitHub Pages

## Estado

| Tarea | Estado | Detalle |
|-------|--------|---------|
| C1 — Crear repositorio | ✅ local / ⏳ remoto | Repo Git inicializado en `/home/hermes/mudanza-casa-app`. Falta crear `edavidlink/casa-search` en GitHub y subir `main`. |
| C2 — Elegir URL final | ✅ Decidido | Subruta: `https://edavidlink.github.io/casa-search/` |
| C3 — Habilitar GitHub Pages | ✅ workflow / ⏳ activación | Workflow creado en `.github/workflows/deploy.yml`. Falta push al remoto y activar Source = GitHub Actions en Settings. |
| C4 — Dominio personalizado | ✅ Omitido | Se usa `github.io`; sin dominio propio configurado. |

## Decisión C2: subruta `/casa-search/`

Se eligió la subruta porque:
- No bloquea el dominio raíz de la cuenta (`edavidlink.github.io`).
- Permite otros proyectos bajo la misma cuenta sin conflictos.
- El repo se llamará `casa-search`.

Ajuste aplicado:
- `frontend/vite.config.js` → `base: '/casa-search/'`
- Build verificado: los assets en `frontend/dist/index.html` usan `/casa-search/...`.

## Pasos pendientes (requieren token de GitHub)

La gh CLI está instalada (`gh version 2.97.0`) pero no autenticada. Para terminar la fase ejecuta:

```bash
# 1. Autenticar gh CLI con un Personal Access Token (repo + workflow)
export GH_TOKEN="<tu-token-de-github>"
echo "$GH_TOKEN" | gh auth login --with-token --hostname github.com

# 2. Crear el repo remoto y subir la rama main
cd /home/hermes/mudanza-casa-app
gh repo create casa-search --public --source . --push --remote origin

# 3. Habilitar GitHub Pages con Source = GitHub Actions
#    Opción A: por UI
#      Repo → Settings → Pages → Source → GitHub Actions
#    Opción B: por API (equivalente)
gh api repos/edavidlink/casa-search/pages \
  --method POST \
  -f source='{"branch":"main","path":"/"}' \
  -f build_type=workflow 2>/dev/null || \
gh api repos/edavidlink/casa-search/pages \
  --method PUT \
  -f source='{"branch":"main","path":"/"}'

# 4. Disparar/observar el primer deploy
gh run list --repo edavidlink/casa-search
gh run watch --repo edavidlink/casa-search
```

## URL esperada tras el deploy

```
https://edavidlink.github.io/casa-search/
```

## Notas para la FASE D

- `frontend/src/config.js` usa `VITE_API_BASE_URL` o `''`. En producción se debe pasar la URL real del backend como secreto/build-arg o hardcodearla antes del deploy.
- El workflow actual no inyecta `VITE_API_BASE_URL`; por eso el frontend cargará la estructura pero las llamadas a `/api` fallarán hasta conectar el backend.
