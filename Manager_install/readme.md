# Manager Repo 

Paquete de instalación para uso global. La versión instalada se ve con `mfs version` (archivo [`VERSION`](VERSION)).

>[!NOTE]
> El panel web (`mfs ui`) es **opcional**: solo se usa si ejecutas `mfs ui` y es lo único que necesita Node.
> Todo lo demás funciona solo con la terminal. Si prefieres la versión anterior, solo terminal y sin panel:
> `git clone -b v8.0.2 https://github.com/noxopio/manager_scripts.git`

Este script ha sido diseñado para optimizar la gestión de múltiples repositorios y microfrontends (Mf), permitiendo la ejecución de tareas comunes como iniciar, clonar o detener microfrontends de manera eficiente.

---

## Características Principales

- Gestión centralizada de múltiples repositorios mediante un archivo de configuración (`listRep.txt`).
- Instalación y actualización de dependencias en paralelo.
- Ejecución y monitoreo de microfrontends.
- Comandos para detener procesos y liberar recursos del sistema.
- Configuración simplificada y personalizable.

---

## Requisitos

>[!IMPORTANT]
> **El script debe ejecutarse desde la línea de comandos.**
> 
> Ejemplo:
> ```bash
> ./manager_install.sh      # o: bash manager_install.sh (no "sh": en Ubuntu/Debian es dash)
> ```

1. **Dependencias necesarias**:
   - `npm`
   - `git` (en Windows, Git for Windows con Git Bash)
   - `node` 18 o superior, solo para el panel `mfs ui` (sin `npm install`). `mfs ui` lo comprueba al arrancar.

2. **Permisos de ejecución**:
   Es necesario asegurarse de que los scripts tengan permisos de ejecución:
   ```bash
   chmod +x *.sh
   ```

---

## Instalación de la Herramienta

El script `manager_install.sh` automatiza la instalación de la herramienta `mfs` y configura un alias global para facilitar su uso desde cualquier ubicación.

### Pasos de Instalación

1. Ejecutar el script de instalación:
   ```bash
   ./manager_install.sh
   ```

2. Una vez completada la instalación, el alias `mfs` estará disponible para ejecutar los comandos de la herramienta.

>[!NOTE]
> En caso de que el script no tenga permisos de ejecución, estos pueden otorgarse con el siguiente comando:
> ```bash
> chmod +x manager_install.sh
> ```

---

## Linux y WSL

La instalación es la misma que en Git Bash, con estos detalles:

- **Ejecuta el instalador con bash**: `./manager_install.sh` o `bash manager_install.sh`. No uses `sh manager_install.sh`: en Ubuntu/Debian `sh` es `dash` y los scripts fallan.
- **WSL es otro sistema**: tiene su propio home (`/home/<usuario>`) y su propio `~/.bashrc`. Lo instalado desde Git Bash en Windows no existe dentro de WSL, así que instala mfs también dentro de WSL. Clona en el home de Linux (`~`), no en `/mnt/c/...`.
- **Node para `mfs ui`**: instálalo dentro de Linux/WSL, por ejemplo con nvm:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc && nvm install --lts
  node --version   # 18 o superior
  which node       # debe ser /home/<usuario>/.nvm/..., no /mnt/c/... (el Node de Windows no sirve)
  ```
- **`cannot execute: required file not found`** (o `$'\r': command not found`): los scripts tienen saltos de línea de Windows (CRLF). El repo fuerza LF con `.gitattributes`, pero si copiaste los archivos desde Windows conviértelos e instala de nuevo:
  ```bash
  sudo apt install -y dos2unix
  dos2unix *.sh ui/* VERSION readme.md && ./manager_install.sh --force
  ```
- **zsh**: el instalador solo escribe en `~/.bashrc`. Añade al final de `~/.zshrc`: `source ~/manager_scripts/manager_rc.sh`
- **Panel en WSL**: `mfs ui --no-open` y abre en el navegador de Windows la URL que muestra (`http://127.0.0.1:4777`).
- **Repos `#NEW`**: se abren en el primer emulador de terminal disponible; sin entorno gráfico corren en segundo plano con la salida en `<repo>/mfs-run.log`.

---

## Archivo de Repositorios (`listRep.txt`)

El archivo `listRep.txt` actúa como el núcleo de configuración de la herramienta `mfs`. Contiene las URLs de los repositorios que serán gestionados.

### Formato del Archivo

- Cada línea debe incluir una URL de repositorio.
- Las líneas que comienzan con `#` serán tratadas como comentarios.
- Etiquetas disponibles:
  - `#NEW`: Abre el repositorio en una nueva ventana de terminal.
  - `#EXCLUDE`: Excluye el repositorio de las operaciones.
- Es posible agregar comandos específicos al final de la URL.

**Ejemplo**:
```text
https://github.com/usuario/repo1.git #NEW
https://github.com/usuario/repo2.git
https://github.com/usuario/repo3.git #EXCLUDE
https://github.com/usuario/repo4.git npm run dev #NEW
```

>[!NOTE]
> Es importante asegurarse de que no haya espacios al final de cada URL y que la última línea del archivo contenga un salto de línea.

---

## Comandos Disponibles

| Comando                  | Descripción                                      |
|--------------------------|--------------------------------------------------|
| `mfs help`               | Muestra ejemplos de uso y documentación básica. |
| `mfs list`               | Crea o edita el archivo `listRep.txt`.          |
| `mfs pull listRep.txt`   | Clona o actualiza los repositorios especificados.|
| `mfs run`                | Ejecuta los microfrontends configurados.        |
| `mfs install listRep.txt`| Instala las dependencias de los repositorios.   |
| `mfs updeps listRep.txt` | Actualiza las dependencias de los repositorios. |
| `mfs ps`                 | Lista los procesos en ejecución.                |
| `mfs kill`               | Detiene todos los procesos de Node.js activos.  |
| `mfs uninstall`          | Desinstala la herramienta y elimina configuraciones.|
| `mfs ui`                 | Abre el panel web local para gestionar los repos.|
| `mfs status`             | `git status` de cada repo.                       |
| `mfs -m "msg" commit`    | `git add .` + `git commit` en los repos con cambios.|
| `mfs push`               | `git push` de cada repo (sin `--force`).         |
| `mfs -b rama checkout`   | Cambia todos los repos a esa rama.               |
| `mfs -b rama newbranch`  | Crea la rama en todos los repos desde su rama actual. |
| `mfs -b rama -B base newbranch` | Crea la rama desde una rama base específica. |
| `mfs version`            | Muestra la versión instalada (archivo `VERSION`). |
| `mfs update`             | `git pull --ff-only` del repo de origen y reinstala sin preguntas. |

>[!NOTE]
> Los repos con `#NEW` se abren en una ventana nueva: en Windows con `start`, en macOS con Terminal y en Linux con el primer emulador disponible (`$TERMINAL`, `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `xterm`). Dentro de `tmux` se abre una ventana de tmux. Sin entorno gráfico, el repo corre en segundo plano y su salida va a `<repo>/mfs-run.log`.

>[!WARNING]
> El comando `mfs list` sobrescribirá el contenido existente del archivo `listRep.txt`. Se recomienda realizar un respaldo si contiene información importante.

---

## Ejemplos de Uso

### Clonar o Actualizar Repositorios (Historial Parcial)
```bash
mfs pull listRep.txt
```

>[!NOTE]
> Para obtener el historial completo ir al respositorio en cuestion y usar :
> ```bash
> git pull --unshallow
> ```

### Usar una Rama Personalizada
```bash
mfs -b fix/branch pull listRep.txt
```
- Si no se especifica una rama, se utilizará `main` como valor predeterminado.

### Instalar Dependencias
```bash
mfs install listRep.txt
```

### Comandos Git
```bash
mfs status                          # git status -sb de cada repo
mfs -m "fix: corrige login" commit  # git add . + commit (omite repos sin cambios)
mfs push                            # git push; si la rama no tiene upstream usa "push -u origin HEAD"
mfs -b develop checkout             # cambia de rama (funciona aunque el clon sea --depth=1)
mfs -b feature/nueva newbranch      # crea desde la rama actual y cambia a ella
mfs -b feature/nueva -B develop newbranch # crea desde develop y cambia a ella
```
- `newbranch` requiere un nombre explícito con `-b`; no crea `main` por defecto.
- Nunca se usa `--force`.
- `mfs -b otra pull` ahora también cambia correctamente de rama en repos ya clonados con `--depth=1`.
- Si algún repo falla, el comando termina con error (código 1) e indica que revises la salida.

### Error "Another git process seems to be running in this repository"
Git crea `.git/index.lock` mientras trabaja y lo borra al terminar. Si un git se corta a mitad (cerrar la terminal o el panel, Detener o `mfs kill` durante un pull o commit), el archivo queda y git rechaza commit, pull y checkout en ese repo.
```bash
mfs unlock          # lista los repos bloqueados y, tras confirmar, quita los bloqueos
```
- `mfs pull`, `commit`, `push`, `checkout` y `newbranch` avisan y **omiten** los repos bloqueados en lugar de fallar con el error de git.
- En el panel, la tarjeta muestra `🔒 bloqueado` y el botón **Desbloquear**.
- Para evitarlo: no cerrar la terminal o el panel ni usar `mfs kill` en mitad de un pull o commit.

### Repos Privados sin Guardar el Token en la Lista
En `listRep.txt` pon solo el usuario en la URL, y da el token por variable de entorno:
```text
https://carlos.camacho@dev.azure.com/AXAColpatriaInsurance/ARLSource/_git/txnportal-app-home
```
```bash
read -s MFS_GIT_TOKEN; export MFS_GIT_TOKEN   # pide el token sin mostrarlo
mfs pull
```
- Git lo pide a través de `git-askpass.sh` solo cuando el remoto exige credenciales. El token **no se escribe** en la lista ni en `.git/config`.
- También se acepta `https://usuario:@host/...`.
- Las URLs que **ya traen** `usuario:token@` siguen funcionando igual. Se pueden mezclar ambas formas.
- Para limpiar un clon antiguo que tiene el token guardado en su `origin`: `git remote set-url origin https://usuario@dev.azure.com/...`.

### Usar un Comando de Instalación Personalizado
Con `-i` se cambia el comando que usan `install` y `updeps` (por defecto `npm install`). Se puede combinar con `-b`.
```bash
mfs -i "npm i --legacy-peer-deps" install listRep.txt
mfs -i "npm ci" updeps
mfs -b develop -i "pnpm install" install
```

### Ejecutar Microfrontends
```bash
mfs run
```

### Actualizar Dependencias
```bash
mfs updeps listRep.txt
```

### Panel Web Local (`mfs ui`)
```bash
cd /ruta/donde/estan/los/repos   # el mismo directorio donde está listRep.txt
mfs ui                           # abre http://127.0.0.1:4777
mfs ui ../listas/otra.txt        # abrir con otra lista (igual que "mfs run otra.txt")
mfs ui --port 5000 --no-open     # puerto distinto, sin abrir el navegador
```
- El campo **Lista** acepta cualquier `.txt`: relativo (`../listas/otra.txt`), `C:\ruta\lista.txt` o `/c/ruta/lista.txt`. Recuerda las últimas usadas.
- **📂 Buscar…** abre un explorador para navegar carpetas y unidades (`C:`, `D:`…), buscar `.txt` por nombre en subcarpetas (ignora `node_modules` y `.git`), usar el archivo como lista, editarlo o crear uno nuevo.
- Cada repo corre como un proceso independiente, con su propio log en el panel y su botón **Detener**. Los repos marcados con `#NEW` siguen abriendo su propia ventana, como en `mfs run`.
- **Git**: los botones *Ver cambios*, *Commit…*, *Push*, *Checkout* y *Nueva rama* actúan sobre los repos seleccionados, y cada tarjeta tiene además *Cambios*, *Commit* y *Push*. *Nueva rama* pide el nombre y permite elegir una base común; por defecto parte de la rama actual de cada repo.
  - Las tarjetas muestran `● N cambios`, `↑N` (commits por subir) y `↓N` (commits por traer).
  - Commit solo actúa sobre los repos con cambios. Antes de confirmar, el diálogo muestra los archivos de cada repo y el resumen de líneas (`git diff --stat`). Push y checkout piden confirmación con la lista de repos y su rama.
- Al terminar una acción sobre varios repos (pull, install, commit…) aparece un **resumen** con cuántos acabaron bien y cuáles fallaron, y un botón **Reintentar fallidos**.
- El log de la última ejecución de cada repo se guarda en `~/.mfs_ui/logs/`, así que sigue visible al cerrar y reabrir el panel.
- El estado git se recarga solo al volver a la pestaña del panel (como mucho cada 10 s), además del botón de recargar.
- Las listas nuevas solo se pueden crear dentro de la carpeta de trabajo; las que ya existen se pueden editar estén donde estén.
- **Token git**: campo de la cabecera para repos privados (URL `https://usuario@host/...`). Se guarda solo en la memoria del panel mientras está abierto, nunca en disco. También lo usa "Importar de GitHub" si su campo de token está vacío. Si un push necesita credenciales y no hay token ni gestor de credenciales, falla con un mensaje en lugar de quedarse esperando.
- **Install con**: comando que usan Install y Updeps (equivale a `mfs -i`). Si se deja vacío, se usa `npm install`. Trae sugerencias como `npm i --legacy-peer-deps` o `npm ci`.
- **Run con**: comando opcional para los repos seleccionados. Vacío conserva el comando de cada repo (o `npm run start` si no está definido). Se recuerda por lista en este navegador y no modifica el `.txt`.
- Un indicador discreto a la derecha del estado del token muestra cuántas operaciones siguen activas y respeta la preferencia del sistema para reducir movimiento.
- La consola vacía muestra una marca de agua MFS; los estados vacíos tienen iconos y las tarjetas usan acentos sutiles según su estado.
- **Seguir** (en el panel de logs): desplaza el log automáticamente hasta la última línea. Desmárcalo para leer líneas anteriores sin que la salida nueva mueva la vista.
- **Procesos Node** equivale a `mfs ps` / `mfs kill`, pero solo termina los procesos que marques (**Matar seleccionados**, con confirmación). Los paneles mfs abiertos aparecen señalados y no se pueden marcar.
- **Editar lista** permite importar repos de una organización o usuario de GitHub, o insertar la plantilla de ejemplo (equivale a `mfs list`).
- **Ayuda** muestra este README (equivale a `mfs help`).
- **Base64** permite codificar texto UTF-8, decodificarlo o formatearlo como JSON desde una ventana del panel; no requiere `jq`.
- `mfs border` y `mfs uninstall_manager` siguen disponibles solo en la terminal.
- Una tarjeta por repo con su estado, rama actual, dependencias y puerto detectado.
- Botones globales y por repo para **Pull / Install / Updeps / Run / Detener**, y un log en vivo por repo.
- Editor integrado de `listRep.txt` (sustituye a `mfs list`).
- No cambia el rendimiento: el panel lanza el mismo `manager_repo.sh` en paralelo, un proceso por repo (con la variable `MFS_ONLY=<repo>`).
- Requiere solo `node` (sin `npm install`). Escucha únicamente en `127.0.0.1`.

#### Varios paneles a la vez
Se puede abrir un panel por cada carpeta de proyecto:
```bash
cd /proyectos/arl  && mfs ui          # http://127.0.0.1:4777
cd /proyectos/otro && mfs ui          # 4777 ocupado -> usa 4778 automáticamente
mfs ui --port 5000                    # --port fuerza un puerto concreto (falla si está ocupado)
```
- Sin `--port`, cada panel toma el primer puerto libre a partir de 4777. La consola indica cuál usa.
- Cada panel tiene su carpeta, sus logs y su "Detener todo", que solo afecta a lo que lanzó ese panel.
- Los paneles abiertos se registran en `~/.mfs_ui/panels/`, para que "Procesos Node" no permita matarlos.

>[!WARNING]
> "Detener todo" en el panel detiene solo los procesos lanzados desde el panel. **No** uses `mfs kill` en la terminal con paneles abiertos: mata *todos* los procesos de Node, incluidos los paneles.

>[!TIP]
> Si Node no encuentra bash (por ejemplo, porque el `bash` del PATH es el de WSL), define la ruta:
> `export MFS_BASH="C:\Program Files\Git\bin\bash.exe"`

### Listar Procesos en Ejecución
```bash
mfs ps
```

### Detener Procesos en Ejecución
```bash
mfs kill
```
>[!TIP]
> Utilice el comando `mfs help` para acceder a ejemplos de uso y documentación básica.
>
>

---
---

>[!TIP] Notas Adicionales
- Si no se proporciona un archivo al ejecutar un comando, el script buscará uno llamado `listRep.txt` en el directorio actual.
- Si no se encuentra el archivo, se mostrará un mensaje de error y la ejecución se detendrá.
- Para especificar un archivo diferente, proporcione la ruta completa como segundo argumento.

- Asi `mfs run  ../repos/archivo.txt`  
 

- **Activar o desactivar bordes en los mensajes de salida**:
  ```bash
  mfs border
  Mostrar bordes? (true/false): true
  ```
 
- **Eliminar carpetas `node_modules` innecesarias**:
  ```bash
  npx npkill
  ```

- **Remover archivos no rastreados**:
  ```bash
  git clean -fn
  ```

- **Liberar un puerto específico**:
  ```bash
  npx kill-port 4200
  ```
---

---
>[!CAUTION] Desinstalación de la Herramienta

>[!CAUTION]
> Este comando eliminará todas las configuraciones asociadas a la herramienta `mfs`. Se recomienda respaldar cualquier archivo importante antes de proceder.
> ```bash
> mfs uninstall
> ```


>[!NOTE]Cada script tiene notas de uso.
