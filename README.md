# 🌿 ReUse - Plataforma de Economia Circular

**ReUse** é uma solução digital colaborativa que promove a troca sustentável de produtos entre moradores urbanos. Inspirada nos princípios da economia circular, a plataforma transforma o "lixo" de uns em valor para outros, reduzindo o desperdício e fortalecendo os laços comunitários através da tecnologia.

---

## 🚀 Visão Geral

A plataforma foi desenvolvida para resolver o problema de produtos parados em casa e o descarte excessivo em centros urbanos. Através de um sistema de gamificação e uma interface intuitiva, o ReUse incentiva os usuários a trocarem itens em vez de comprarem novos, promovendo um estilo de vida mais consciente.

## ✨ Funcionalidades Principais

### 📍 Geolocalização Inteligente
A plataforma utiliza a localização do usuário para sugerir trocas que estão acontecendo no seu bairro, minimizando a pegada de carbono do transporte e incentivando a sustentabilidade local.

### 🤖 EcoBot (IA Sustentável)
Integrado com a **API do Google Gemini**, o EcoBot é um assistente virtual especializado que:
- Dá dicas de como reciclar produtos específicos.
- Explica o funcionamento do sistema de pontos.
- Incentiva práticas sustentáveis com sugestões personalizadas.

### 🎮 Gamificação e Recompensas
Cada troca gera **Pontos ReUse** e aumenta o **Nível Sustentável** do usuário. Isso cria um ciclo virtuoso onde a colaboração é recompensada com status e impacto ambiental visível.

### 🔍 Exploração e Filtros
Sistema avançado de filtros por categoria (Eletrônicos, Móveis, Livros, etc.) e cálculo de distância em tempo real para facilitar o encontro do item perfeito.

### 🔐 Segurança com Firebase
- **Autenticação**: Login seguro via Google.
- **Real-time**: Atualização instantânea de novos itens e solicitações de troca via Firestore.
- **Regras de Segurança**: Proteção rigorosa de dados de usuário e transações.

---

## 🛠️ Stack Tecnológica

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS 4](https://tailwindcss.com/) (Design Moderno & Responsivo)
- **Animações**: [Framer Motion](https://www.framer.com/motion/)
- **Backend/DB**: [Firebase](https://firebase.google.com/) (Auth, Firestore)
- **Inteligência Artificial**: [Google Gemini API](https://ai.google.dev/) (@google/genai)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 📁 Estrutura do Projeto

```text
├── src/
│   ├── components/       # Componentes de UI reutilizáveis
│   ├── lib/              # Utilitários e configurações (Firebase, Utils)
│   ├── services/         # Integrações com APIs externas (Gemini)
│   ├── App.tsx           # Componente principal e lógica de rotas
│   ├── index.css         # Variáveis de tema e estilos globais
│   └── main.tsx          # Ponto de entrada da aplicação
├── firebase-blueprint.json # Definição da estrutura de dados do banco
├── firestore.rules       # Regras de segurança do banco de dados
├── metadata.json         # Metadados da aplicação e permissões
└── package.json          # Dependências e scripts
```

---

## 🎨 Identidade Visual

O design do ReUse segue uma estética **Swiss Modern**, focada em tipografia clara e layout "Bento Grid".
- **Tipografia**: *Inter* para funcionalidade e *Playfair Display* para elegância editorial.
- **Paleta**: Tons de terra (`#5A5A40`), pretos profundos e brancos neutros para passar uma sensação de sobriedade e natureza.

---

## 🚀 Como Fazer Deploy no Vercel

O projeto está configurado para um deploy simples no Vercel:

1. **Importe o Repositório**: Conecte seu GitHub/GitLab ao Vercel.
2. **Configurações de Build**:
   - **Framework Preset**: Vite (detectado automaticamente).
   - **Root Directory**: `./` (raiz do projeto).
3. **Variáveis de Ambiente**:
   Você **DEVE** configurar as seguintes variáveis no painel do Vercel:
   - `GEMINI_API_KEY`: Sua chave da API Google AI (obtenha em [Google AI Studio](https://aistudio.google.com/)).
4. **Firebase**: O arquivo `firebase-applet-config.json` já contém as configurações do seu projeto Firebase. Certifique-se de que o **Email/Password Authentication** está ativado no console do seu Firebase.

---

## 🛠️ Como Utilizar (Demo)

1. **Acesse a plataforma** e faça login com sua conta Google.
2. **Verifique seu Perfil**: Você começará com 100 pontos iniciais.
3. **Explore Itens**: Use a aba "Explorar" para ver o que há perto de você.
4. **Anuncie**: Clique no botão `+` para listar um item que você não usa mais.
5. **EcoBot**: Use o ícone de mensagem no canto inferior para tirar dúvidas sobre sustentabilidade.

---

*Desenvolvido como parte do projeto de evolução tecnológica para o fomento da sustentabilidade urbana.*
