# ESTOQUE — Sistema de Automação e Gestão Preditiva de Estoque de TI (Farmarcas)

Aplicação web Full Stack construída para gerenciar o estoque de TI da empresa (300 colaboradores), com automação de baixas via Webhooks (JIRA e WhatsApp), alertas por e-mail, criação de tarefas de compra no JIRA e algoritmo preditivo de reposição.

---

## 📍 Localização do Projeto
```
C:\Users\katiely.silva_farmar\Desktop\MVP ESTOQUE
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + Vite, React Router, Recharts, Axios, Vanilla CSS (Design System Preto, Branco e Laranja)
- **Backend**: Node.js + Express, JWT (Access + Refresh tokens), bcrypt
- **Banco de Dados**: SQLite (via `node:sqlite` nativo do Node.js — zero configuração)

---

## 🚀 Passo a Passo para Rodar o Projeto

### Passo 1: Iniciar o Backend

1. Abra um terminal e navegue até a pasta do backend:
   ```bash
   cd "C:\Users\katiely.silva_farmar\Desktop\MVP ESTOQUE\backend"
   ```

2. Execute o script de Seed para inicializar o banco de dados e criar os usuários master e os dados de exemplo:
   ```bash
   npm run seed
   ```

3. Inicie o servidor backend:
   ```bash
   npm run dev
   ```
   > O servidor backend rodará em: `http://localhost:3001`

---

### Passo 2: Iniciar o Frontend

1. Abra **outro terminal** e navegue até a pasta do frontend:
   ```bash
   cd "C:\Users\katiely.silva_farmar\Desktop\MVP ESTOQUE\frontend"
   ```

2. Inicie o servidor do frontend:
   ```bash
   npm run dev
   ```
   > O frontend rodará em: `http://localhost:5173`

---

## 🔑 Credenciais de Acesso (Seed)

> [!NOTE]
> As senhas padrão para desenvolvimento e teste não estão mais expostas no código e devem ser configuradas no arquivo `backend/.env`.

| Perfil | E-mail | Variável no `.env` | Permissões |
|---|---|---|---|
| **Admin Master** | `admin@farmarcas.com.br` | `SEED_ADMIN_PASSWORD` | Acesso total, Triggers, Gestão de Usuários, Estoque |
| **TI** | `katiely.silva@farmarcas.com.br` | `SEED_TI_PASSWORD` | Gestão de Estoque, Pedidos, Alertas, Relatórios |
| **TI** | `ti@farmarcas.com.br` | `SEED_TI_PASSWORD` | Gestão de Estoque, Pedidos, Alertas, Relatórios |
| **Patrimônio** | `patrimonio@farmarcas.com.br` | `SEED_PATRIMONIO_PASSWORD` | Visualização de estoque e relatórios |

---

## 🎯 Novas Funcionalidades Implementadas

1. **Alteração de Quantidade do Pedido pelo Admin/TI**:
   - No Dashboard e na página **Pedidos de Compra**, o Admin e a equipe de TI podem editar diretamente a quantidade a ser pedida de qualquer item pendente antes de confirmar o pedido no JIRA.

2. **Área Exclusiva de Pedidos de Compra**:
   - Página `/pedidos` dividida em **A Serem Feitos (Pendentes)** e **Pedidos Realizados (Histórico)** com link direto para tarefas do JIRA.

3. **Relatórios Comparativos com Múltiplos Meses**:
   - Na aba **Relatórios Mensais**, selecione múltiplos meses (ex: Mar, Mai, Jul 2026).
   - O gráfico de consumo por item exibe **colunas de barras agrupadas por mês com cores distintas** para comparação lado a lado.

4. **Permissões Estendidas para a Equipe de TI**:
   - O perfil `TI` agora tem acesso completo para **adicionar novos itens**, **editar**, **excluir** e **registrar entradas/saídas**, exatamente igual ao Admin.

5. **Identidade Visual Farmarcas**:
   - Logo oficial da Farmarcas integrada na barra lateral e tela de login.
   - Remoção de todos os emojis, substituídos por um conjunto de ícones SVG limpos e modernos.