#!/bin/bash
# Versión 5.0.1 - Ejecución de procesos en paralelo y gestión de procesos de Node en ejecución
set -e
## Notas de uso:
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
# Si no se especifica la rama, el script usará la rama predeterminada 'develop'.
#
# Ejemplo de uso:
# ./manager_repo.sh -b fix/branch pull listRep.txt
# En este ejemplo, el script ejecutará el comando pull en todos los repositorios de la lista especificada en listRep.txt,
# utilizando la rama 'fix/branch' en lugar de la rama predeterminada 'develop'.
#
# Si no se usa la opción -b, el script usará la rama 'develop' por defecto para todas las operaciones de git clone, git pull.
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

## Colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
CIAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"
FILE_NAME="$(basename "$0")"
COMMANDS=("pull" "run" "install" "updeps" "kill" "list" "ps" "uninstall_manager" "help")
BRANCH="develop"  # Rama por defecto

border() {
    local color="$1"
    local message="$2"
    local length=$(( ${#message} + 4 ))
    local border_line=$(printf '%0.s─' $(seq 1 $length))
    
    echo -e "${color}╭${border_line}╮"
    echo -e "│  ${message}  │"
    echo -e "╰${border_line}╯${RESET}"
}

log_info() {
    local message="[INFO] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$CIAN" "$message"
}

log_description() {
    local message="[DESCRIPCIÓN] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$GREEN" "$message"
}

log_warning() {
    local message="[WARNING] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$YELLOW" "$message"
}

log_error() {
    local message="[ERROR] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$RED" "$message"
}





## Función para mostrar el uso correcto del script
show_usage() {

     
    log_info                 "                     EJEMPLOS DE USO DEL SCRIPT                        "  "no-prefix"

     printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[8]}:" "./$(basename "$0") ${COMMANDS[8]}"
    log_description "Muestra el uso correcto del script."

     
    # Ejemplo de uso para el comando "pull"
     printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[0]}:" "./$(basename "$0") ${COMMANDS[0]}"
    log_description "  Clona o actualiza repositorios desde la lista especificada." 
     
    
    # Ejemplo de uso para el comando "pull" con rama personalizada
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[0]} (rama personalizada):" "./$(basename "$0") -b main ${COMMANDS[0]} listRep.txt"
    log_description "Clona o actualiza repositorios en la rama 'main'."
     

    # Ejemplo de uso para el comando "run"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[1]}:" "./$(basename "$0") ${COMMANDS[1]}"
    log_description "Inicia los microfrontends existentes."
     

    # Ejemplo de uso para el comando "install"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[2]}:" "./$(basename "$0") ${COMMANDS[2]} listRep.txt"
    log_description "Instala las dependencias en cada repositorio de la lista."
     

    # Ejemplo de uso para el comando "updeps"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[3]}:" "./$(basename "$0") ${COMMANDS[3]} listRep.txt"
    log_description "Reinstala o actualiza las dependencias en cada repositorio."
     

    # Ejemplo de uso para el comando "kill"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[4]}:" "./$(basename "$0") ${COMMANDS[4]}"
    log_description "Mata los procesos de Node en ejecución."
     

    # Ejemplo de uso para el comando "list"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[5]}:" "./$(basename "$0") ${COMMANDS[5]}"
    log_description "Crea un archivo listRep.txt con las URLs de los repositorios."
     
  
   # Ejemplo de uso para el comando "ps"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[6]}:" "./$(basename "$0") ${COMMANDS[6]}"
    log_description "Muestra los procesos de Node en ejecución."
     

    # # Ejemplo de uso para el comando "uninstall_manager"
    # printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[7]}:" "./$(basename "$0") ${COMMANDS[7]}"
    # log_description "Desinstala $FILE_NAME."
     
     log_warning 'Para más información, consulta el archivo README.md .'
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
    # Obtener los procesos de Node
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
while getopts ":b:" opt; do
    case "$opt" in
        b) BRANCH="$OPTARG" ;;  # Rama personalizada
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
     show_usage
     ;;

     *)
     log_error "Comando '$cmd' no reconocido para manejo sin archivo."
     exit 1
     ;;
     esac
     exit 0
    }

non_list_commands=("list" "kill" "ps" "uninstall_manager" "help")
    if [[ " ${non_list_commands[*]} " == *" $1 "* ]]; then
    handle_non_list_command "$1"
    fi

# ## Verificar si el primer argumento es 'list'
# if [ "$1" == "list" ]; then
#     printf "%s\n" "----------------------------------------" 
#  $HOME/manager_scripts/url_extractor.sh
#     printf "%s\n" "----------------------------------------" 
#     exit 0  
# fi
# # si el primer argumento es 'kill' llamar a la función kill_node_processes
# if [ "$1" == "kill" ]; then
#     kill_node_processes 
#     exit 0  
# fi
# # si el primer argumento es 'ps' llamar a la función ps_process
# if [ "$1" = "ps" ]; then
#     printf "%s\n" "----------------------------------------" 
#     ps_process
#     printf "%s\n" "----------------------------------------" 
#     exit 0
# fi
# # si el primer argumento es 'uninstall_manager' llamar al script manager_uninstall.sh 
# if [ "$1" = "uninstall_manager" ]; then
#     printf "%s\n" "----------------------------------------" 
#     $HOME/manager_scripts/manager_uninstall.sh
#     printf "%s\n" "----------------------------------------" 
#     exit 0
# fi

## Verificar si se proporciona un archivo como argumento (segundo parámetro)
file_name_list="${2:-listRep.txt}"

## Verificar si el archivo de repositorios existe
if [ ! -f "$file_name_list" ]; then
   log_error "El archivo $file_name_list no existe. Por favor,crea este archivo con las URLs de los repositorios."
    exit 1
fi

source_repos=()
while IFS= read -r repo; do
    # Ignorar líneas vacías o repos con "#EXCLUDE"
    if [[ -z "$repo" || "$repo" == *"#EXCLUDE"* ]]; then
        continue
    fi
    source_repos+=("$repo")
done <"$file_name_list"

## Leer repositorios desde el archivo proporcionado en una sola línea
# mapfile -t source_repos < <(grep -v '^#' "$file_name_list" | grep -v '^$' | grep -v '#EXCLUDE')

pull_repos() {
    for repo_url in "${source_repos[@]}"; do
        repo_name=$(basename "$repo_url")
        log_info "Procesando $repo_name"

        if [ ! -d "$repo_name" ]; then
        ## Clon parcial de los repositorios, usa   git pull fetch --unshallow para obtener el historial completo.
             git clone -q -b "$BRANCH" "$repo_url" --depth=1 &
            
        else
            (
                cd "$repo_name" || exit
                git checkout "$BRANCH"
                git pull
            ) &
        fi
    done
    wait
}
# manejar dependencias 
manage_deps() {
    local action=$1 
    for repo_url in "${source_repos[@]}"; do
        repo_name=$(basename "$repo_url")
        log_info "Procesando $repo_name"

        if [ -d "$repo_name" ]; then
            (
                cd "$repo_name" || exit
                if [ "$action" == "install" ]; then
                    if [ ! -d "node_modules" ]; then
                        npm install
                    else
                log_warning "Dependencias ya instaladas en $repo_name"
                    fi
                else
                log_info " Instalando  dependencias en $repo_name..."
                    npm install
                fi
            ) &
        else
               log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'"
        fi
    done
    wait
}

run_repos() {
    for repo_url in "${source_repos[@]}"; do
        repo_name=$(basename "$repo_url")
        log_info "Procesando $repo_name"

    if [[ "$repo_name" == *"mse"* ]]; then
        start bash -c "cd $repo_name; npm run dev" &
    else
    (
         cd "$repo_name" || exit
         
         npm run start
    ) &
        fi
    done
    wait
}


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
      log_info "Dependencias instaladas."
     ;;
    
    updeps)
     log_info "Actualizando dependencias"
     manage_deps "reinstall"
     log_info "Dependencias actualizadas."
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
  

log_info "Ejecución Terminada."
