# VivirdeDJ — Gestión Comercial

Software interno de gamificación y gestión del equipo de ventas de **VivirdeDJ**.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend/DB**: Supabase (Auth + PostgreSQL + RLS)
- **Deploy**: Vercel

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd gestioncomercialvdj
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con los valores reales de tu proyecto Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 4. Configurar base de datos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** en el panel de Supabase
3. Ejecuta el contenido de `/supabase/schema.sql`
4. Ve a **Authentication → Users** y crea los usuarios del equipo

### 5. Crear usuarios

En el SQL Editor de Supabase, después de crear usuarios en Auth:

```sql
-- Actualizar rol de admin (reemplaza el email)
UPDATE public.users SET role = 'admin' WHERE email = 'admin@tuemail.com';
```

O bien, al crear usuarios por la API de Supabase, pasa el meta `role`:
```json
{ "name": "Nombre Admin", "role": "admin" }
```

### 6. Levantar el servidor local

```bash
npm run dev
```

Accede a `http://localhost:5173`

---

## Deploy en Vercel

### Conectar con GitHub

1. Sube el proyecto a un repositorio de GitHub
2. Ve a [vercel.com](https://vercel.com) e importa el repositorio
3. Vercel detecta automáticamente que es un proyecto Vite

### Variables de entorno en Vercel

En **Project Settings → Environment Variables**, añade:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase |

### Deploy automático

Cada push a `main` lanza un nuevo deploy automáticamente.

El archivo `vercel.json` ya está configurado para manejar el routing de SPA correctamente.

---

## Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ConfettiCelebration.jsx
│   ├── EmptyState.jsx
│   ├── Modal.jsx
│   ├── ProgressBar.jsx
│   └── StatCard.jsx
├── context/
│   └── AuthContext.jsx  # Auth + perfil de usuario
├── lib/
│   └── supabase.js      # Cliente Supabase
├── pages/
│   ├── LoginPage.jsx
│   ├── admin/           # Panel administrador
│   │   ├── AdminLayout.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminObjectives.jsx
│   │   ├── AdminPoints.jsx
│   │   ├── AdminRewards.jsx
│   │   └── AdminLeaderboard.jsx
│   └── employee/        # Panel empleado
│       ├── EmployeeLayout.jsx
│       ├── EmployeeDashboard.jsx
│       ├── EmployeeKPI.jsx
│       ├── EmployeeRewards.jsx
│       └── EmployeeLeaderboard.jsx
├── App.jsx
├── main.jsx
└── index.css
supabase/
└── schema.sql           # Schema completo de la BD
```

---

## Funcionalidades

### Panel Admin
- **Dashboard**: Vista general de todos los empleados con progreso y puntos
- **Objetivos**: CRUD de KPIs con asignación individual o a todo el equipo
- **Puntos**: Reglas de cuántos puntos vale cada acción
- **Recompensas**: Catálogo de premios con coste en puntos
- **Ranking**: Leaderboard por semana, mes o todo el tiempo

### Panel Empleado
- **Mi panel**: Objetivos activos con barras de progreso + puntos y próximas recompensas
- **Mis KPIs**: Formulario para registrar resultados diarios + historial
- **Recompensas**: Catálogo con botón de canje (deshabilitado si no hay puntos suficientes)
- **Ranking**: Leaderboard del mes con posición propia destacada

### Lógica de puntos
- Al superar un objetivo (llegar al 100%), se asignan puntos automáticamente
- Los puntos se almacenan en `point_transactions`
- Al canjear una recompensa, se descuentan los puntos
- Celebración visual con confetti al superar un objetivo

---

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Panel admin completo + CRUD de todo |
| `employee` | Panel empleado: ver sus datos, registrar KPIs, canjear recompensas |
