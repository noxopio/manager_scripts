#!/bin/bash
# Versión 5.0.1 - Ejecución de procesos en paralelo y gestión de procesos de Node en ejecución

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
#   | |  888       888 888         "Y8888P"   | |  
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

log_info() {
    printf "${CIAN} [INFO] $1 ${RESET}\n"
}
log_description() {
    printf "${GREEN} [Descripción]: $1 ${RESET}\n"
}

log_warning() {
    printf "${YELLOW} [WARNING] $1 ${RESET}\n"
}

log_error() {
    printf "${RED} [ERROR] $1 ${RESET}\n"
}

file_name="$(basename "$0")"
commands=("pull" "run" "install" "updeps" "kill" "list" "ps" "uninstall_manager")
BRANCH="develop"  # Rama por defecto

## Función para mostrar el uso correcto del script
show_usage() {

    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"
    printf "${CIAN}                          USO DEL SCRIPT: ${RESET}\n"
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "pull"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[0]}:" "./$(basename "$0") ${commands[0]} listRep.txt"
    log_description "Clona o actualiza repositorios desde la lista especificada."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"
    
    # Ejemplo de uso para el comando "pull" con rama personalizada
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[0]} (rama personalizada):" "./$(basename "$0") -b main ${commands[0]} listRep.txt"
    log_description "Clona o actualiza repositorios en la rama 'main'."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "run"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[1]}:" "./$(basename "$0") ${commands[1]}"
    log_description "Inicia los microfrontends existentes."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "install"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[2]}:" "./$(basename "$0") ${commands[2]} listRep.txt"
    log_description "Instala las dependencias en cada repositorio de la lista."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "updeps"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[3]}:" "./$(basename "$0") ${commands[3]} listRep.txt"
    log_description "Reinstala o actualiza las dependencias en cada repositorio."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "kill"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[4]}:" "./$(basename "$0") ${commands[4]}"
    log_description "Mata los procesos de Node en ejecución."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "list"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[5]}:" "./$(basename "$0") ${commands[5]}"
    log_description "Crea un archivo listRep.txt con las URLs de los repositorios."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"
  
   # Ejemplo de uso para el comando "ps"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[6]}:" "./$(basename "$0") ${commands[6]}"
    log_description "Muestra los procesos de Node en ejecución."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    # Ejemplo de uso para el comando "uninstall_manager"
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${commands[7]}:" "./$(basename "$0") ${commands[7]}"
    log_description "Desinstala el script manager."
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"


}
 ## Función para matar los procesos de Node en ejecución
kill_node_processes() {
        processes=$(  ps aux | grep '[n]ode' | awk '{print $1}' )
      if [ -z "$processes" ]; then
        log_error "No hay procesos de Node en ejecución."
        exit 0 # Retorna un código de error
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
        exit 0 # Retorna un código de error
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
    printf "${RED} :-------------------------------------------------------------------------------------------------------------------------:${RESET}\n"
                    log_error "Se requiere al menos un argumento [${commands[*]}] y el archivo .txt."
    printf "${RED} :-------------------------------------------------------------------------------------------------------------------------:${RESET}\n"
                     log_warning "Si no se proporciona un archivo .txt,el script buscará uno llamado 'listRep.txt' en el directorio actual."
    printf "${RED} :-------------------------------------------------------------------------------------------------------------------------:${RESET}\n"

    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"
    printf "${GREEN} |%-79s|${RESET}\n" "Uso: ./$(basename "$0") [${commands[*]}] [archivo_lista]"
    printf "${GREEN} :-------------------------------------------------------------------------------:${RESET}\n"

    show_usage
    exit 1
fi
## Verificar si el primer argumento es 'list'
if [ "$1" == "list" ]; then
    printf "%s\n" "----------------------------------------" 
 $HOME/manager_scripts/url_extractor.sh
    printf "%s\n" "----------------------------------------" 
    exit 0  
fi
# si el primer argumento es 'kill' llamar a la función kill_node_processes
if [ "$1" == "kill" ]; then
    kill_node_processes 
    exit 0  
fi
# si el primer argumento es 'ps' llamar a la función ps_process
if [ "$1" = "ps" ]; then
    printf "%s\n" "----------------------------------------" 
    ps_process
    printf "%s\n" "----------------------------------------" 
    exit 0
fi
# si el primer argumento es 'uninstall_manager' llamar al script manager_uninstall.sh 
if [ "$1" = "uninstall_manager" ]; then
    printf "%s\n" "----------------------------------------" 
    $HOME/manager_scripts/manager_uninstall.sh
    printf "%s\n" "----------------------------------------" 
    exit 0
fi



## Verificar si se proporciona un archivo como argumento (segundo parámetro)
file_name_list="${2:-listRep.txt}"

## Verificar si el archivo de repositorios existe
if [ ! -f "$file_name_list" ]; then
   log_error "El archivo $file_name_list no se encuentra en el directorio. Por favor, crea este archivo con las URLs de los repositorios.\n"
    exit 1
fi

microfrontend_repos=()
while IFS= read -r repo; do
    # Ignorar líneas vacías o repos con "#EXCLUDE"
    if [[ -z "$repo" || "$repo" == *"#EXCLUDE"* ]]; then
        continue
    fi
    microfrontend_repos+=("$repo")
done <"$file_name_list"

## Leer repositorios desde el archivo proporcionado en una sola línea
# mapfile -t microfrontend_repos < <(grep -v '^#' "$file_name_list" | grep -v '^$' | grep -v '#EXCLUDE')

pull_repos() {
    for repo_url in "${microfrontend_repos[@]}"; do
        repo_name=$(basename "$repo_url")
        log_info "Procesando $repo_name"

        if [ ! -d "$repo_name" ]; then
 
            git clone -b "$BRANCH" "$repo_url"               &
            
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
    for repo_url in "${microfrontend_repos[@]}"; do
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
                   log_info " Instalando  dependencias en $repo_name...\n"
                    npm install
                fi
            ) &
        else
               log_error "El repositorio $repo_name no existe. Clona primero usando 'pull'\n"
        fi
    done
    wait
}

run_repos() {
    for repo_url in "${microfrontend_repos[@]}"; do
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
## Manejar comandos con case
case "$1" in
pull)
    printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
    log_info "Iniciando  pull ..."
    printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
    pull_repos
    printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
    log_info "Pull terminado."
    printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
    ;;
run)
    log_info "Iniciando microfrontends en paralelo..."
    run_repos
    log_info "Microfrontends Detenidos."
    ;;
install)

    printf "${GREEN} <-------------------------------------------------------->${RESET}\n"
   log_info               "Instalando dependencias..."
    printf "${GREEN} <-------------------------------------------------------->${RESET}\n"
     manage_deps "install"
    log_info "Dependencias instaladas."
    ;;
updeps)
    printf "${GREEN} :--------------------------------------------------------:${RESET}\n"
    log_info "Actualizando dependencias"
    printf "${GREEN} :--------------------------------------------------------:${RESET}\n"
     manage_deps "reinstall"
    printf "${CIAN} :--------------------------------------------------------:${RESET}\n"
      log_info "Dependencias actualizadas."
    printf "${CIAN} :--------------------------------------------------------:${RESET}\n"
    ;;
*)
    printf "${RED} :--------------------------------------------------------:${RESET}\n"
    log_error "Comando inválido. Por favor, verifica la sintaxis."
    printf "${RED} :--------------------------------------------------------:${RESET}\n"
    show_usage
    exit 1
    ;;
esac

end_time=$(date +%s)
duration=$((end_time - start_time))

# Mensaje de resumen de repositorios procesados

printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
printf "${CIAN} |%-20s %-58s| ${RESET}\n" "" "Repositorios procesados: ${#microfrontend_repos[@]}"
printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"

# Mensaje de tiempo de ejecución
printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"
printf "${GREEN} |%-50s %-28s | ${RESET}\n" "Tiempo de ejecución:$duration segundos"
printf "${CIAN} :-------------------------------------------------------------------------------:${RESET}\n"

log_info "Ejecución Terminada."