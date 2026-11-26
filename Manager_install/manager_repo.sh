#!/bin/bash
# Versión: ver el archivo VERSION (mfs version) - Ejecución de procesos en paralelo y gestión de procesos de Node en ejecución
set -e
## Notas de uso:
##Esta version requiere estar en el mismo directorio con el script manager_logs.sh, ya que este contiene las funciones de mensajes. 
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  
#   | |                                       | |  
#   | |  888b     d888 8888888888  .d8888b.   | |  
#   | |  8888b   d8888 888        d88P  Y88b  | |  
#   | |  88888b.d88888 888        Y88b.       | |  
#   | |  888Y88888P888 8888888     "Y888b.    | |  
#   | |  888 Y888P 888 888            "Y88b.  | |  
#   | |  888  Y8P  888 888              "888  | |  
#   | |  888   "   888 888        Y88b  d88P  | |  
#   | |  888       888 888         "08888P"   | |  
#   | |                                       | |  
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  

# Este script está diseñado para facilitar la gestión de múltiples repositorios. 
# El script debe ser ejecutado desde la línea de comandos ;
# bash manager_repo.sh
# El script requiere al menos un argumento:
# - El primer argumento debe ser el comando a ejecutar (`pull`, `run`, `install`, `updeps`,list).
# - El segundo argumento es opcional y corresponde al archivo que contiene las URLs de los repositorios.
# 
# bash manager_repo.sh pull listRep.txt

# Si no se proporciona el archivo, el script buscará uno llamado `listRep.txt` en el mismo directorio.
# Si no se encuentra el archivo, se mostrará un mensaje de error y la ejecución se detendrá.
# Si el archivo `listRep.txt` está en un directorio diferente o tiene otro nombre, 
# se debe especificar el nombre del archivo o la ruta completa en el segundo argumento.
# Ejemplo: ./manager_repo.sh pull /listas/urlsRepos.txt

# Uso del script:
# El script debe ser ejecutado  con uno de los siguientes comandos:
# 1. **Pull**: Para clonar o actualizar los repositorios.
#    ./manager_repo.sh pull listRep.txt
# 2. **Run**: Para ejecutar los microfrontends.
#    ./manager_repo.sh run
# 3. **Install**: Para instalar las dependencias en los repositorios.
#    ./manager_repo.sh install listRep.txt
# 4. **Updeps**: Para reinstalar las dependencias.
#    ./manager_repo.sh updeps listRep.txt
# 5. **Kill**: Para matar los procesos de Node en ejecución.
#    bash manager_repo.sh kill
# 6. **List**: Para crear un archivo listRep.txt con los repositorios desde un script externo.
#    bash manager_repo.sh list
# 7. **Ps**: Para mostrar los procesos de Node en ejecución.
#    bash manager_repo.sh ps
# 8. **Uninstall_manager**: Para desinstalar el script.
#    bash manager_repo.sh uninstall_manager
# 9. **Help**: Para mostrar el uso correcto del script.
#    bash manager_repo.sh help


# El archivo `listRep.txt` (nombre por defecto) debe contener las URLs de los repositorios, una por línea.
# Los comentarios (líneas que empiezan con `#`) y los repositorios marcados con `#EXCLUDE` serán ignorados.
# Ejemplo de archivo `listRep.txt`:
# https://github.com/usuario/repo1.git
# https://github.com/usuario/repo2.git
# https://github.com/usuario/repo3.git #EXCLUDE

## Uso de la rama personalizada:
# Puedes especificar una rama  para todas las operaciones mediante la opción -b. 
# Si no se especifica la rama, el script usará la rama predeterminada 'main'.
#
# Ejemplo de uso:
# ./manager_repo.sh -b fix/branch pull listRep.txt
# En este ejemplo, el script ejecutará el comando pull en todos los repositorios de la lista especificada en listRep.txt,
# utilizando la rama 'fix/branch' en lugar de la rama predeterminada 'main'.
#
# Si no se usa la opción -b, el script usará la rama 'main' por defecto para todas las operaciones de git clone, git pull.
#
## Comandos git (sobre todos los repos de la lista, o uno solo con MFS_ONLY=<repo>):
# ./manager_repo.sh status                      -> git status -sb de cada repo
# ./manager_repo.sh -m "fix: mensaje" commit    -> git add . + git commit en los repos con cambios
# ./manager_repo.sh push                        -> git push (sin --force; si no hay upstream usa -u origin HEAD)
# ./manager_repo.sh -b develop checkout         -> cambia de rama (también en clones --depth=1)
# ./manager_repo.sh -b feature/x newbranch      -> crea la rama y cambia a ella
# ./manager_repo.sh -b feature/x -B develop newbranch -> crea desde una rama base específica
#
## Repos privados sin escribir el token en la lista:
# En listRep.txt la URL lleva solo el usuario: https://usuario@dev.azure.com/org/proyecto/_git/repo
# (también vale https://usuario:@...). El token se da por variable de entorno:
#   read -s MFS_GIT_TOKEN; export MFS_GIT_TOKEN
# Las URLs que ya traen usuario:token siguen funcionando igual.
#
## Uso de un comando de instalación personalizado:
# Con la opción -i se cambia el comando que usan 'install' y 'updeps' (por defecto 'npm install').
# Con -r se sobrescribe el comando de 'run'; si se omite, se usa el comando de cada línea del .txt.
# Ejemplos:
# ./manager_repo.sh -i "npm i --legacy-peer-deps" install listRep.txt
# ./manager_repo.sh -i "npm ci" updeps
# ./manager_repo.sh -b develop -i "pnpm install" install   (se puede combinar con -b)
# Al ejecutar cualquiera de los comandos, el script mostrará el progreso y los resultados de cada operación en la terminal.
 

## Matar los procesos de Node
#  matar un puerto específico con:
# npx kill-port 4200
#
# Para facilitar la tarea de matar procesos de Node, puedes crear un alias:
# alias toolKill='ps aux | grep "[n]ode" | awk '\''{print $1}'\'' && kill $(ps aux | grep "[n]ode" | awk '\''{print $1}'\'')'
#source ~/.bashrc # Para recargar el archivo de configuración de bash y aplicar los cambios.
# Luego, puedes usar el alias `toolKill` para matar los procesos de Node en ejecución.

# Si tiene problemas con los permisos de ejecución, puede usar el siguiente comando
# chmod +x manager_repo.sh
source "$(dirname "$0")/manager_logs.sh"

FILE_NAME="$(basename "$0")"
COMMANDS=("pull" "run" "install" "updeps" "kill" "list" "ps" "uninstall_manager" "help" "ui" "status" "commit" "push" "checkout" "newbranch" "unlock" "version" "update")
# Las lecturas de git (status) no toman el index.lock "opcional": si se cortan no dejan bloqueos.
export GIT_OPTIONAL_LOCKS=0
BRANCH="main"  # Rama por defecto
BRANCH_SET=0
BASE_BRANCH=""  # Rama base opcional solo para newbranch; vacío = HEAD actual
INSTALL_CMD="npm install"  # Comando de instalación por defecto (install / updeps)
RUN_CMD=""  # Sobrescritura opcional del comando run (vacío = usar el comando de la lista)
COMMIT_MSG=""  # Mensaje para 'commit' (opción -m)

## Token git sin guardarlo en la lista: si MFS_GIT_TOKEN está definido, git lo pide vía GIT_ASKPASS
## solo cuando el remoto exige credenciales. Las URLs que ya traen usuario:token siguen funcionando igual.
if [ -n "$MFS_GIT_TOKEN" ]; then
    askpass="$(dirname "$0")/git-askpass.sh"
    command -v cygpath >/dev/null 2>&1 && askpass="$(cygpath -m "$askpass")"
    export GIT_ASKPASS="$askpass"
    # Desactiva el gestor de credenciales solo para estos comandos (no guarda el token en el almacén del sistema)
    export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0=
fi

## Espera a los procesos en segundo plano indicados y devuelve error si alguno falló
## (un "wait" sin argumentos siempre devuelve 0 y ocultaba los fallos).
JOB_FAILED=0
wait_pids() {
    local pid
    for pid in "$@"; do
        wait "$pid" || JOB_FAILED=1
    done
}

 ## Función para matar los procesos de Node en ejecución
kill_node_processes() {
        processes=$(  ps aux | grep '[n]ode' | awk '{print $1}' )
      if [ -z "$processes" ]; then
        log_error "No hay procesos de Node en ejecución."
        exit 0
    fi
        kill $processes
        while IFS= read -r line; do
       log_info "Proceso terminado 👻: $line"
       done <<< "$processes"
}
# Función para mostrar los procesos de Node en ejecución
ps_process() {
    processes=$(ps aux | grep '[n]ode' | awk '{print $1}')
    if [ -z "$processes" ]; then
        log_error "No hay procesos de Node en ejecución."
        exit 0
    fi
    while IFS= read -r line; do
        log_info "Proceso en ejecución: $line"
    done <<< "$processes"
}
 
## Procesar las opciones de línea de comandos
while getopts ":b:B:i:r:m:" opt; do
    case "$opt" in
        b) BRANCH="$OPTARG"; BRANCH_SET=1 ;;  # Rama objetivo personalizada
        B) BASE_BRANCH="$OPTARG" ;;  # Rama base de newbranch
        i) INSTALL_CMD="$OPTARG" ;;  # Comando de instalación personalizado
        r) RUN_CMD="$OPTARG" ;;  # Comando run personalizado
        m) COMMIT_MSG="$OPTARG" ;;  # Mensaje de commit
        \?) echo "Opción no válida: -$OPTARG"; exit 1 ;;
    esac
done
shift $((OPTIND - 1))
## Verificar si se proporciona el primer argumento 
if [ $# -lt 1 ]; then
      
        log_error "Se requiere al menos un argumento y el archivo .txt."
        log_info 'Usa el comando "help" para ver el uso correcto del script.'
        log_warning "Por defecto el script buscara el .txt  llamado 'listRep.txt' en el directorio actual."
        log_description "Uso: ./$(basename "$0") [${COMMANDS[*]}] [archivo_lista]" "no-prefix"
        # show_usage
    exit 1
fi
if [ "$1" = "newbranch" ] && [ "$BRANCH_SET" -ne 1 ]; then
    log_error "Indica el nombre de la rama nueva: mfs -b feature/nombre newbranch [lista.txt]"
    exit 1
fi
handle_non_list_command() {
     local cmd="$1"
     case "$cmd" in
     list)
     log_info "Ejecutando comando list..."
    "$HOME/manager_scripts/url_extractor.sh"
     ;;
     kill)
     log_info "Ejecutando comando kill..."
     kill_node_processes
     ;;
     ps)
     log_info "Ejecutando comando ps..."
     ps_process
     ;;
     uninstall_manager)
     log_info "Ejecutando comando uninstall_manager..."
     "$HOME/manager_scripts/manager_uninstall.sh"
     ;;
     help)
     help
     ;;

     border)
     border_show
     ;;
     version)
     echo "mfs $(cat "$(dirname "$0")/VERSION" 2>/dev/null || echo "desconocida")"
     ;;

     update)
     # Actualiza desde el repo de origen (guardado por el instalador en .source) y reinstala
     src="$(cat "$(dirname "$0")/.source" 2>/dev/null)"
     if [ -z "$src" ] || [ ! -f "$src/manager_install.sh" ]; then
         log_error "No se encuentra el repo de origen de la instalación. Reinstala con: ./manager_install.sh --force"
         exit 1
     fi
     log_info "Actualizando desde $src ..."
     git -C "$src" pull --ff-only || { log_error "git pull falló en $src (¿cambios locales?)"; exit 1; }
     # exec: este script se borra durante la reinstalación, así que se reemplaza el proceso
     MFS_UPDATE=1 exec bash "$src/manager_install.sh" --force
     ;;

     ui)
     # Uso: mfs ui [lista.txt] [--port N] [--no-open]
     if ! command -v node >/dev/null 2>&1; then
         log_error "No se encuentra Node.js. Instala Node 18 o superior: https://nodejs.org"
         exit 1
     fi
     node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
     if [ -z "$node_major" ] || [ "$node_major" -lt 18 ]; then
         log_error "El panel necesita Node 18 o superior (tienes $(node --version 2>/dev/null))."
         exit 1
     fi
     if ! command -v git >/dev/null 2>&1; then
         log_error "No se encuentra git. Instala Git (en Windows, Git for Windows incluye Git Bash)."
         exit 1
     fi
     log_info "Iniciando panel web de mfs..."
     # Pasar al panel la ruta del bash actual (en Git Bash se convierte a ruta Windows para Node)
     if [ -z "$MFS_BASH" ]; then
         if command -v cygpath >/dev/null 2>&1; then
             export MFS_BASH="$(cygpath -w "$BASH")"
         else
             export MFS_BASH="$BASH"
         fi
     fi
     node "$(dirname "$0")/ui/server.js" "${@:2}"
     ;;
     *)
     log_error "Comando '$cmd' no reconocido para manejo sin archivo."
     exit 1
     ;;
     esac
     exit 0
    }

non_list_commands=("list" "kill" "ps" "uninstall_manager" "help" "border" "ui" "version" "update")
    if [[ " ${non_list_commands[*]} " == *" $1 "* ]]; then
    handle_non_list_command "$@"
    fi
# # si el primer argumento es 'kill' llamar a la función kill_node_processes
# if [ "$1" == "kill" ]; then
#     kill_node_processes 
#     exit 0  
# fi

## Verificar si se proporciona un archivo como argumento (segundo parámetro)
file_name_list="${2:-listRep.txt}"

## Verificar si el archivo de repositorios existe
if [ ! -f "$file_name_list" ]; then
   log_error "El archivo $file_name_list no existe. Por favor,crea este archivo con las URLs de los repositorios."
    exit 1
fi
# source_repos=()
declare -A source_repos        # Almacenar URL → comando
declare -A external_repos      # Almacenar URL → flag de ventana externa

# Leer el archivo y procesar las líneas
while IFS= read -r line; do
    line="${line%$'\r'}"   # Soportar archivos con saltos de línea Windows (CRLF)
    # Ignorar líneas vacías, comentarios (empiezan con "#", aunque tengan espacios delante) o que contengan "#EXCLUDE"
    if [[ -z "$line" || "$line" == *"#EXCLUDE"* || "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi

    # Extraer URL, comando y flag opcional
    repo_url=$(echo "$line" | awk '{print $1}')
    # "https://usuario:@host/..." (token vacío) equivale a "https://usuario@host/...": el token llega por MFS_GIT_TOKEN
    repo_url="${repo_url/:@/@}"

    # Filtro opcional (usado por el panel 'mfs ui'): procesar solo el repo indicado en MFS_ONLY
    if [[ -n "$MFS_ONLY" && "$(basename "$repo_url" .git)" != "$MFS_ONLY" ]]; then
        continue
    fi

    repo_command=$(echo "$line" | awk '{$1=""; $NF=""; print $0}' | xargs)  # Extrae el comando sin el flag
    repo_flag=$(echo "$line" | awk '{print $NF}')  # Extrae la última palabra (posible flag)

    # Si el flag no es "#NEW" ni vacío, considera que no hay flag
    if [[ "$repo_flag" != *"#NEW"* && "$repo_flag" != "\"\"" ]]; then
        repo_command=$(echo "$line" | awk '{$1=""; print $0}' | xargs)  # Recupera el comando completo
        repo_flag=""
    fi


    # Si no hay comando, usar "npm run start"
    [[ -z "$repo_command" || "$repo_command" == "$repo_url" ]] && repo_command="npm run start"

    # Guardar en array asociativo
    source_repos["$repo_url"]="$repo_command"

    # Si el flag es "#NEW", marcarlo
    [[ "$repo_flag" == *"#NEW"* ]] && external_repos["$repo_url"]=true
done < "$file_name_list"

# Función para obtener URLs de repositorios
get_repo_urls() {
    echo "${!source_repos[@]}"
}
## Leer repositorios desde el archivo proporcionado en una sola línea
# mapfile -t source_repos < <(grep -v '^#' "$file_name_list" | grep -v '^$' | grep -v '#EXCLUDE')
## Cambia a la rama indicada. Funciona también en clones superficiales de una sola rama
## (git clone --depth=1 -b X), donde un "git checkout otra" simple falla porque no conoce origin/otra.
checkout_branch() {
    local branch="$1"
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        git checkout "$branch"
    elif git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
        log_info "Trayendo la rama remota $branch..."
        # En un clon de una sola rama, origin solo "conoce" la rama clonada: se registra la nueva
        # (si no, git rechaza --track con "starting point is not a branch").
        git remote set-branches --add origin "$branch"
        git fetch --depth=1 origin "$branch"
        git checkout -b "$branch" --track "origin/$branch"
    else
        log_error "La rama '$branch' no existe en $(basename "$PWD") (ni local ni remota). Usa 'newbranch' para crearla."
        return 1
    fi
}

## ── Bloqueos de git abandonados (.git/index.lock) ────────────────────────────
## Git crea index.lock mientras escribe y lo borra al terminar. Si un git se corta a mitad
## (cerrar la terminal o el panel, Detener, mfs kill…) el archivo queda y git rechaza commit/pull/checkout
## con "Another git process seems to be running in this repository".
repo_locked() { [ -f "$1/.git/index.lock" ]; }

warn_locked() {
    log_warning "$1 está bloqueado (.git/index.lock) y se omite. Si no hay ningún git trabajando ahí, quítalo con: mfs unlock"
    JOB_FAILED=1
}

git_is_running() {
    if command -v tasklist >/dev/null 2>&1; then
        tasklist //FI "IMAGENAME eq git.exe" //NH 2>/dev/null | grep -qi "git.exe"
    else
        pgrep -x git >/dev/null 2>&1
    fi
}

unlock_repos() {
    local locked=() name age
    for repo_url in "${!source_repos[@]}"; do
        name=$(basename "$repo_url" .git)
        repo_locked "$name" && locked+=("$name")
    done
    if [ ${#locked[@]} -eq 0 ]; then
        log_success "Ningún repositorio está bloqueado."
        return 0
    fi
    for name in "${locked[@]}"; do
        age=$(( $(date +%s) - $(date -r "$name/.git/index.lock" +%s) ))
        log_warning "Bloqueado: $name (index.lock de hace $((age / 60)) min)"
    done
    if git_is_running; then
        log_warning "Hay un proceso git en ejecución. Si trabaja en alguno de estos repos (p. ej. un commit abierto en VS Code), termínalo antes."
    fi
    log_info "¿Quitar los bloqueos de estos ${#locked[@]} repos?"
    printf "\t[s/n]: "
    read -r answer
    case "$answer" in
        [sS])
            for name in "${locked[@]}"; do
                rm -f "$name/.git/index.lock" && log_success "Bloqueo quitado en $name"
            done
            ;;
        *) log_info "No se quitó ningún bloqueo." ;;
    esac
}

pull_repos() {
    local pids=()
    for repo_url in "${!source_repos[@]}"; do
        repo_name=$(basename "$repo_url" .git)  # git clone crea la carpeta sin ".git"
        log_info "Procesando $repo_name"
        if [ ! -d "$repo_name" ]; then
            # Clon parcial de los repositorios,usar git pull fetch --unshallow para obtener el historial completo.
            git clone -q -b "$BRANCH" "$repo_url" --depth=1 &
        elif repo_locked "$repo_name"; then
            warn_locked "$repo_name"
            continue
        else
            (
                cd "$repo_name" || exit
                checkout_branch "$BRANCH"
                git pull
            ) &
        fi
        pids+=($!)
    done
    wait_pids "${pids[@]}"
}

## ── Comandos git ─────────────────────────────────────────────────────────────
## Ejecuta una función en cada repo clonado (en paralelo) y espera a todos.
for_each_repo() {
    local fn="$1" pids=()
    for repo_url in "${!source_repos[@]}"; do
        repo_name=$(basename "$repo_url" .git)
        if [ ! -d "$repo_name" ]; then
            log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'"
            continue
        fi
        if repo_locked "$repo_name"; then
            warn_locked "$repo_name"
            continue
        fi
        ( cd "$repo_name" && "$fn" "$repo_name" ) &
        pids+=($!)
    done
    wait_pids "${pids[@]}"
}

git_status_repos() {
    # En secuencia para que la salida de cada repo no se mezcle en la terminal
    for repo_url in "${!source_repos[@]}"; do
        repo_name=$(basename "$repo_url" .git)
        if [ ! -d "$repo_name" ]; then
            log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'"
            continue
        fi
        log_info "$repo_name"
        repo_locked "$repo_name" && log_warning "$repo_name está bloqueado (.git/index.lock): commit/pull/checkout fallarán. Usa: mfs unlock"
        git -C "$repo_name" -c color.status=false status -sb || JOB_FAILED=1
    done
}

git_commit_one() {
    if [ -z "$(git status --porcelain)" ]; then
        log_warning "Sin cambios en $1 (se omite)"
        return 0
    fi
    log_info "Commit en $1 ($(git rev-parse --abbrev-ref HEAD)): $COMMIT_MSG"
    git add . && git commit -q -m "$COMMIT_MSG" && git log -1 --oneline
}

git_push_one() {
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD)
    if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
        log_info "Push en $1: la rama $branch no tiene upstream, se publica con -u"
        git push -u origin HEAD
    elif [ "$(git rev-list --count '@{u}..HEAD')" -eq 0 ]; then
        log_warning "Nada que subir en $1 ($branch)"
    else
        log_info "Push en $1 ($branch)"
        git push   # nunca se usa --force
    fi
}

git_checkout_one() {
    log_info "Checkout en $1 -> $BRANCH"
    checkout_branch "$BRANCH"
}

git_newbranch_one() {
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        log_warning "La rama $BRANCH ya existe en $1; usa 'checkout' para cambiar a ella"
        return 0
    fi
    if [ -z "$BASE_BRANCH" ]; then
        log_info "Creando la rama $BRANCH en $1 desde la rama actual"
        git checkout -b "$BRANCH"
    elif git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
        log_info "Creando la rama $BRANCH en $1 desde $BASE_BRANCH local"
        git checkout -b "$BRANCH" "$BASE_BRANCH"
    elif git ls-remote --exit-code --heads origin "$BASE_BRANCH" >/dev/null 2>&1; then
        log_info "Trayendo la rama base remota $BASE_BRANCH en $1..."
        git remote set-branches --add origin "$BASE_BRANCH" &&
          git fetch --depth=1 origin "$BASE_BRANCH" &&
          git checkout -b "$BRANCH" "origin/$BASE_BRANCH"
    else
        log_error "La rama base '$BASE_BRANCH' no existe en $1 (ni local ni remota)"
        return 1
    fi
}
# manejar dependencias 
manage_deps() {
    local action=$1 pids=()
    for repo_url in "${!source_repos[@]}"; do
        repo_name=$(basename "$repo_url" .git)  # git clone crea la carpeta sin ".git"
        log_info "Procesando $repo_name"
        if [ -d "$repo_name" ]; then
            (
                cd "$repo_name" || exit
                if [ "$action" == "install" ]; then
                    if [ ! -d "node_modules" ]; then
                        log_info "Instalando dependencias en $repo_name con: $INSTALL_CMD"
                        eval "$INSTALL_CMD"
                    else
                        log_warning "Dependencias ya instaladas en $repo_name"
                    fi
                else
                    log_info "Instalando dependencias en $repo_name con: $INSTALL_CMD"
                    eval "$INSTALL_CMD"
                fi
            ) &
            pids+=($!)
        else
            log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'"
        fi
    done
    wait_pids "${pids[@]}"
}
## Abre el comando de un repo (#NEW) en una ventana de terminal nueva, según el sistema.
## Uso: open_external_terminal <carpeta> <comando>
open_external_terminal() {
    local dir="$1" cmd="$2" inner esc
    printf -v inner 'cd %q && %s' "$dir" "$cmd"
    case "$OSTYPE" in
        msys*|cygwin*)  # Windows (Git Bash)
            start bash -c "$inner" &
            return
            ;;
        darwin*)        # macOS: Terminal.app (necesita la ruta absoluta)
            printf -v inner 'cd %q && %s' "$PWD/$dir" "$cmd"
            esc="${inner//\\/\\\\}"; esc="${esc//\"/\\\"}"
            osascript -e "tell application \"Terminal\" to do script \"$esc\"" >/dev/null &
            return
            ;;
    esac
    # Linux: primer emulador de terminal disponible (solo si hay entorno gráfico)
    if [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]; then
        if [ -n "$TERMINAL" ] && command -v "$TERMINAL" >/dev/null 2>&1; then
            "$TERMINAL" -e bash -c "$inner" & return
        fi
        if command -v x-terminal-emulator >/dev/null 2>&1; then x-terminal-emulator -e bash -c "$inner" & return; fi
        if command -v gnome-terminal >/dev/null 2>&1; then gnome-terminal -- bash -c "$inner" & return; fi
        if command -v konsole >/dev/null 2>&1; then konsole -e bash -c "$inner" & return; fi
        if command -v xfce4-terminal >/dev/null 2>&1; then xfce4-terminal -x bash -c "$inner" & return; fi
        if command -v xterm >/dev/null 2>&1; then xterm -e bash -c "$inner" & return; fi
    fi
    if [ -n "$TMUX" ]; then
        tmux new-window -n "$dir" "$inner"
        return
    fi
    # Sin entorno gráfico ni tmux: en segundo plano con el log en un archivo
    log_warning "No hay terminal gráfica: $dir se ejecuta en segundo plano. Log: $dir/mfs-run.log"
    nohup bash -c "$inner" > "$dir/mfs-run.log" 2>&1 &
}

##Función para ejecutar los repositorios.
run_repos() {
    for repo_url in "${!source_repos[@]}"; do
        repo_name=$(basename "$repo_url" .git)  # git clone crea la carpeta sin ".git"
        run_command="${source_repos[$repo_url]}"
        [[ -n "$RUN_CMD" ]] && run_command="$RUN_CMD"
        is_external="${external_repos[$repo_url]}"

        log_info "Procesando $repo_name"
        if [ ! -d "$repo_name" ]; then
            log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'."
            continue
        fi
        log_info "Ejecutando: $run_command"

        if [[ "$is_external" == "true" ]]; then
            log_info "Abriendo en ventana externa..."
            open_external_terminal "$repo_name" "$run_command"
        else
            (
                cd "$repo_name" || exit
                eval "$run_command"
            ) &
        fi
    done
    wait
}
# start_time , end_time y duration son variables para medir el tiempo de ejecución
start_time=$(date +%s)

    case "$1" in
    pull)
      log_info "Iniciando  pull ..."
      pull_repos
      log_info "Pull terminado."
      ;;
    run)
    log_info "Iniciando microfrontends en paralelo..."
    run_repos
    log_info "Microfrontends Detenidos."
     ;;
    
    install)
      log_info               "Instalando dependencias..."
      manage_deps "install"
      log_success "Dependencias instaladas."
     ;;
    
    updeps)
     log_info "Actualizando dependencias"
     manage_deps "reinstall"
     log_success "Dependencias actualizadas."
     ;;

    status)
     git_status_repos
     ;;

    commit)
     if [ -z "$COMMIT_MSG" ]; then
         log_error "Falta el mensaje de commit. Uso: mfs -m \"mensaje\" commit [lista.txt]"
         exit 1
     fi
     log_info "git add . + commit en los repos con cambios..."
     for_each_repo git_commit_one
     ;;

    push)
     log_info "Push de los repos (sin --force)..."
     for_each_repo git_push_one
     ;;

    checkout)
     log_info "Cambiando a la rama $BRANCH..."
     for_each_repo git_checkout_one
     ;;

    newbranch)
     log_info "Creando la rama $BRANCH..."
     for_each_repo git_newbranch_one
     ;;

    unlock)
     log_info "Buscando bloqueos de git (.git/index.lock)..."
     unlock_repos
     ;;

*)
    log_error "Comando inválido. Por favor, verifica la sintaxis."
    show_usage
    exit 1
    ;;
esac

end_time=$(date +%s)
duration=$((end_time - start_time))
# Mensaje de resumen de repositorios procesados
  
log_info "Repositorios procesados: ${#source_repos[@]}" "no-prefix"
# Mensaje de tiempo de ejecución
log_description  "Tiempo de ejecución:$duration segundos" "no-prefix"
if [ "$JOB_FAILED" -ne 0 ]; then
    log_error "Ejecución terminada con errores en uno o más repositorios (revisa la salida)."
    exit 1
fi
log_success "Ejecución Terminada."

