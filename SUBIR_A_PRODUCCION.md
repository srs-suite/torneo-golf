# 🚀 CÓMO SUBIR TU CÓDIGO A PRODUCCIÓN

## 📊 **TU SITUACIÓN ACTUAL**

❌ **No tienes Git configurado en tu proyecto**

Necesitas elegir UNA de estas opciones para subir tu código al servidor:

---

## 🎯 **OPCIÓN 1: CON GIT (RECOMENDADO) ⭐**

### Ventajas:
✅ Fácil de actualizar (solo haces `git pull`)  
✅ Control de versiones  
✅ Puedes revertir cambios  
✅ Trabajo en equipo más fácil  

### Pasos:

#### **A. Inicializar Git en tu proyecto**

```powershell
# Ir a tu proyecto
cd C:\Documents\proyectos\Torneogolf

# Inicializar Git
git init

# Agregar archivos
git add .

# Hacer primer commit
git commit -m "Initial commit - TeeTracker Pro v1.0"
```

#### **B. Crear repositorio en GitHub/GitLab**

**Opción B1: GitHub (Más popular)**
1. Ve a https://github.com/new
2. Nombre: `teetracker-pro`
3. Privado: ✅ (recomendado)
4. No agregues README, .gitignore, ni licencia
5. Click en "Create repository"

**Opción B2: GitLab (Alternativa)**
1. Ve a https://gitlab.com/projects/new
2. Nombre: `teetracker-pro`
3. Privado: ✅ (recomendado)
4. Click en "Create project"

#### **C. Conectar tu proyecto con el repositorio**

```powershell
# GitHub
git remote add origin https://github.com/TU_USUARIO/teetracker-pro.git
git branch -M main
git push -u origin main

# O GitLab
git remote add origin https://gitlab.com/TU_USUARIO/teetracker-pro.git
git branch -M main
git push -u origin main
```

#### **D. En el servidor de producción**

```bash
# Conectar por SSH
ssh usuario@tu-servidor.com

# Clonar el repositorio
cd /var/www
git clone https://github.com/TU_USUARIO/teetracker-pro.git

# Seguir la GUIA_PRODUCCION.md desde el paso 4
```

#### **E. Para actualizar en el futuro**

```powershell
# En tu computadora local
git add .
git commit -m "Descripción de los cambios"
git push

# En el servidor
cd /var/www/teetracker-pro
git pull
./deploy.sh
```

---

## 🎯 **OPCIÓN 2: CON SCP/SFTP (MÁS SIMPLE PERO MANUAL)**

### Ventajas:
✅ No necesitas aprender Git  
✅ Funciona inmediatamente  
✅ Sin configuración adicional  

### Desventajas:
❌ Actualizar es más tedioso  
❌ No hay control de versiones  
❌ Puedes sobrescribir archivos por error  

### Pasos:

#### **A. Comprimir tu proyecto**

```powershell
# Ir a tu proyecto
cd C:\Documents\proyectos\Torneogolf

# Comprimir (necesitas 7-Zip o WinRAR)
# Excluye: node_modules, .git, dist
```

**Archivos a INCLUIR:**
- ✅ `backend/` (sin node_modules)
- ✅ `frontend/` (sin node_modules, sin dist)
- ✅ `ecosystem.config.cjs`
- ✅ `deploy.sh`
- ✅ `GUIA_PRODUCCION.md`
- ✅ Todos los archivos `.md`

**Archivos a EXCLUIR:**
- ❌ `node_modules/`
- ❌ `frontend/dist/`
- ❌ `.git/`
- ❌ `backend/.env` (lo crearás en el servidor)
- ❌ `*.log`
- ❌ `backups/`

#### **B. Subir con WinSCP (Windows)**

1. **Descargar WinSCP:** https://winscp.net/eng/download.php
2. **Conectar:**
   - Protocolo: SFTP
   - Host: IP de tu servidor
   - Puerto: 22
   - Usuario: tu usuario SSH
   - Contraseña: tu contraseña SSH
3. **Subir:**
   - Navegar a `/var/www/`
   - Crear carpeta `teetracker-pro`
   - Arrastrar y soltar archivos

#### **C. Subir con SCP (PowerShell)**

```powershell
# Desde Windows (con OpenSSH instalado)
scp -r C:\Documents\proyectos\Torneogolf usuario@tu-servidor.com:/var/www/teetracker-pro
```

#### **D. En el servidor**

```bash
ssh usuario@tu-servidor.com
cd /var/www/teetracker-pro

# Instalar dependencias
cd backend
npm install --production

cd ../frontend
npm install
npm run build

# Seguir GUIA_PRODUCCION.md desde el paso 6
```

---

## 🎯 **OPCIÓN 3: CON FILEZILLA (GUI FRIENDLY)**

### Pasos:

1. **Descargar FileZilla:** https://filezilla-project.org/download.php?type=client
2. **Conectar:**
   - Host: `sftp://tu-servidor.com`
   - Usuario: tu usuario SSH
   - Contraseña: tu contraseña
   - Puerto: 22
3. **Subir archivos** arrastrando y soltando

---

## 🎯 **OPCIÓN 4: DIRECTAMENTE EN EL SERVIDOR (NO RECOMENDADO)**

Si tienes acceso al servidor, puedes editar directamente ahí:

```bash
ssh usuario@tu-servidor.com
cd /var/www
mkdir teetracker-pro
cd teetracker-pro

# Copiar archivos manualmente o usar nano/vim para crear cada archivo
```

❌ **No recomendado:** Es muy tedioso y propenso a errores.

---

## 📊 **COMPARACIÓN DE OPCIONES**

| Opción | Dificultad | Tiempo Setup | Actualizaciones | Recomendado |
|--------|-----------|--------------|-----------------|-------------|
| **Git** | Media | 15 min | Muy fácil | ⭐⭐⭐⭐⭐ |
| **WinSCP** | Fácil | 5 min | Manual | ⭐⭐⭐ |
| **SCP** | Fácil | 1 min | Manual | ⭐⭐⭐⭐ |
| **FileZilla** | Fácil | 5 min | Manual | ⭐⭐⭐ |
| **Manual** | Difícil | 60+ min | Muy difícil | ⭐ |

---

## 🎯 **MI RECOMENDACIÓN**

### **Para producción seria: OPCIÓN 1 (Git)**

```powershell
# 1. Inicializar Git
cd C:\Documents\proyectos\Torneogolf
git init
git add .
git commit -m "Initial commit - TeeTracker Pro v1.0"

# 2. Crear repositorio en GitHub (privado)
# Ve a: https://github.com/new

# 3. Conectar y push
git remote add origin https://github.com/TU_USUARIO/teetracker-pro.git
git branch -M main
git push -u origin main

# 4. En el servidor
ssh usuario@tu-servidor.com
cd /var/www
git clone https://github.com/TU_USUARIO/teetracker-pro.git
```

### **Para pruebas rápidas: OPCIÓN 2 (WinSCP)**

Usa WinSCP para subir los archivos manualmente.

---

## ⚠️ **IMPORTANTE: ARCHIVOS SENSIBLES**

**NUNCA subas estos archivos a Git público:**
- ❌ `backend/.env` (contraseñas de base de datos)
- ❌ Archivos con claves API
- ❌ Certificados SSL privados

**Solución:**
- El `.gitignore` ya está configurado para excluir `.env`
- Crea `backend/.env` manualmente en el servidor
- Usa `backend/env.production.example` como template

---

## 📞 **¿CUÁL ELIJO?**

**Responde estas preguntas:**

1. **¿Sabes usar Git?**
   - Sí → **Opción 1 (Git)**
   - No → Sigue a pregunta 2

2. **¿Vas a actualizar seguido?**
   - Sí → **Aprende Git (Opción 1)**
   - No → **Opción 2 (WinSCP)**

3. **¿Tienes prisa?**
   - Sí → **Opción 2 (WinSCP)**
   - No → **Opción 1 (Git)**

---

## 🚀 **PASOS SIGUIENTES**

Una vez que elijas tu método:

1. ✅ Sube el código al servidor
2. ✅ Sigue `GUIA_PRODUCCION.md`
3. ✅ Usa `CHECKLIST_PRODUCCION.md` para verificar
4. ✅ Prueba todo
5. ✅ ¡Listo! 🎉

---

## 💡 **NECESITAS AYUDA?**

**Para configurar Git:**
- Tutorial oficial: https://git-scm.com/book/es/v2
- GitHub Desktop (GUI): https://desktop.github.com/

**Para WinSCP:**
- Tutorial: https://winscp.net/eng/docs/start

**Para servidor:**
- Consulta `GUIA_PRODUCCION.md` paso a paso


