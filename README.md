# User Research Suite

Protocole Builder · Brief Builder · Analysis Engine — propulsé par Claude.

## Déploiement sur Vercel (5 minutes)

### Prérequis
- Compte [Vercel](https://vercel.com) (gratuit)
- Compte [Anthropic](https://console.anthropic.com) avec une clé API

### Option A — Via GitHub (recommandé)

1. Créez un repo GitHub et poussez ce projet :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/VOTRE_USER/user-research-suite.git
   git push -u origin main
   ```

2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importez votre repo

3. Avant de déployer, ajoutez la variable d'environnement :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : `sk-ant-api03-...` (votre clé Anthropic)

4. Cliquez **Deploy** — votre app est en ligne sur `https://user-research-suite.vercel.app`

### Option B — Via CLI Vercel

```bash
npm install -g vercel
vercel
# Suivez les instructions, puis ajoutez la variable :
vercel env add ANTHROPIC_API_KEY
```

## Développement local

```bash
npm install

# Créez un fichier .env.local avec votre clé :
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." > .env.local

npm run dev
# → http://localhost:3000
```

## Structure du projet

```
user-research-suite/
├── app/
│   ├── api/
│   │   └── claude/
│   │       └── route.ts     ← Route API sécurisée (clé jamais exposée au client)
│   ├── page.tsx             ← Application complète
│   ├── layout.tsx
│   └── globals.css
├── package.json
├── tsconfig.json
└── next.config.js
```

## Coûts estimés

Avec claude-sonnet-4 :
- Génération d'un protocole : ~$0.02
- Génération des slides : ~$0.03
- Analyse de résultats : ~$0.05–0.08

Pour une équipe avec 30 analyses/mois : **< $5/mois**
