#!/bin/bash
# FILE_NAME=$(basename "$0")
#version="2.0.3"
#Ya que el script es transversal,debe estar  en el mismo directorio que los scripts que lo llaman.
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
# Variables de Color
# El script define varias variables de color para formatear los mensajes:
# RED: Rojo (\e[31m)
# GREEN: Verde (\e[32m)
# YELLOW: Amarillo (\e[33m)
# BLUE: Azul (\e[34m)
# CIAN: Cian (\e[36m)
# MAGENTA: Magenta (\e[35m)
# RESET: Reset (\e[0m)
# Funciones de Logs
# border_show() Esta función permite al usuario decidir si mostrar bordes alrededor de los mensajes de log.
# Lee el estado actual de la variable SHOW_BORDER desde un archivo externo.
# border(color, message)
# Esta función muestra un mensaje con o sin bordes, dependiendo del valor de SHOW_BORDER.
# log_info(message, [no-prefix])
# Muestra un mensaje de información.
# log_success(message, [no-prefix])
# Muestra un mensaje de éxito.
# log_description(message, [no-prefix])
# Muestra un mensaje de descripción.
# log_warning(message, [no-prefix])
# Muestra un mensaje de advertencia.
# log_error(message, [no-prefix])
# Muestra un mensaje de error.
## Colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
CIAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"
INSTALL_DIR="$HOME/manager_scripts"
SHOW_BORDER=true
SCRIPT_DIR="$(dirname "$0")"
SHOW_BORDER_FILE="$SCRIPT_DIR/show_border_state"
border_show(){
    read -p "Mostrar bordes? (true/false): " SHOW_BORDER
    if [ "$SHOW_BORDER" = true ]; then
        log_info "Mostrando bordes..."
    elif [ "$SHOW_BORDER" = false ]; then
        log_info "Ocultando bordes..."
    else
        log_error "Valor no válido para SHOW_BORDER. Debe ser 'true' o 'false'."
    fi
    # Guardar el estado de SHOW_BORDER en el archivo temporal
    echo "$SHOW_BORDER" > "$SHOW_BORDER_FILE"
}


# Leer el estado de SHOW_BORDER desde el archivo temporal si existe
if [ -f "$SHOW_BORDER_FILE" ]; then
    SHOW_BORDER=$(cat "$SHOW_BORDER_FILE")
else
    SHOW_BORDER=false
fi

border() {
        local color="$1"
        local message="$2"
    if [ "$SHOW_BORDER" = true ]; then
        local length=$(( ${#message} + 4 ))
        local border_line=$(printf '%0.s─' $(seq 1 $length))
        
        echo -e "${color}╭${border_line}╮"
        echo -e "│  ${message}  │"
        echo -e "╰${border_line}╯${RESET}"
    else
           echo -e "\n${color}${message}\n"
    fi
}

log_info() {
    local message="[INFO] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$CIAN" "$message"
}
log_success() {
    local message="[COMPLETED] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$GREEN" "$message"
}

log_description() {
    local message="[DESCRIPTION] $1"
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

    log_description "Muestra la documentación de uso del script."
     printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[8]}:" "mfs ${COMMANDS[8]}"

     
    # Ejemplo de uso para el comando "pull"
    log_description "  Clona o actualiza repositorios desde la lista especificada." 
     printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[0]}:" "mfs ${COMMANDS[0]}"
     
    
    # Ejemplo de uso para el comando "pull" con rama personalizada
    log_description "Clona o actualiza repositorios en la rama 'dev'."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[0]} (rama personalizada):" "mfs -b dev ${COMMANDS[0]} [opcional: custom.txt]"
     

    # Ejemplo de uso para el comando "run"
    log_description "Inicia los microfrontends existentes."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[1]}:" "mfs ${COMMANDS[1]}"
     

    # Ejemplo de uso para el comando "install"
    log_description "Instala las dependencias en cada repositorio de la lista."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[2]}:" "mfs ${COMMANDS[2]} [opcional: custom.txt]"
     

    # Ejemplo de uso para el comando "updeps"
    log_description "Reinstala o actualiza las dependencias en cada repositorio."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[3]}:" "mfs ${COMMANDS[3]} [opcional: custom.txt]"
     

    # Ejemplo de uso para el comando "kill"
    log_description "Mata los procesos de Node en ejecución."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[4]}:" "mfs ${COMMANDS[4]}"
     

    # Ejemplo de uso para el comando "list"
    log_description "Crea un archivo listRep.txt con las URLs de los repositorios."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[5]}:" "mfs ${COMMANDS[5]}"
     
  
   # Ejemplo de uso para el comando "ps"
    log_description "Muestra los procesos de Node en ejecución."
    printf "${CIAN}  %-10s %-60s ${RESET}\n" "${COMMANDS[6]}:" "mfs ${COMMANDS[6]}"
   
# Ejemplo de uso para el comando "help"
     log_warning "Consultar el archivo README.md ubicado en $INSTALL_DIR"
}
##-----------------------------------------------------------------------------------#
    
                    # Funciones de mensajes
##-----------------------------------------------------------------------------------#
error_404() {
    echo -e "$RED"
    cat << "EOF"
              _
             | |
             | |===( )   //////
             |_|   |||  | o o|                                 
                    ||| ( c  )                  ____
                     ||| \= /                  ||   \_
                      ||||||                   ||4 0 4|
                      ||||||                ...||__/|-"
                      ||||||             __|________|__
                        |||             |______________|
                        |||             || ||      || ||
  DA                   |||             || ||      || ||
------------------------|||-------------||-||------||-||-------
                        |__>            || ||      || ||
EOF
    echo -e "$RESET"
}

##-----------------------------------------------------------------------------------#
                 
##-----------------------------------------------------------------------------------#

message_uninstall() {
    echo -e "$RED"
    cat << "EOF"
     _.-^^---....,,--       
 _--                  --_  
<       M   F    S        >)
|                         | 
 \._                   _./  
    '''--. . ,; .--'''       
          | |   |            
       .-=||  | |=--.   
      '-=UNINSTALLED=-'   
          | ;  :|     
  _____.,-#%&$@%#&#~,._____
EOF
    echo -e "$RESET"
}

##-----------------------------------------------------------------------------------#
                 
##-----------------------------------------------------------------------------------#
MFS_MANAGER(){
echo -e "\e[31m"  
cat << "EOF"

 __| |_______________________________________| |__
 __   _______________________________________   __
   | |                                       | |  
   | |                                       | |  
   | |  888b     d888 8888888888  .d8888b.   | |  
   | |  8888b   d8888 888        d88P  Y88b  | |  
   | |  88888b.d88888 888        Y88b.       | |  
   | |  PU2H88888M41N 8888888     "Y088b.    | |  
   | |  888 Y888P 888 888            "S8N0.  | |  
   | |  888  Y8P  888 888              "888  | |  
   | |  888   "   888 888        Y88b  dFU1  | |  
   | |  888       888 888         "08888P"   | |  
   | |                                       | |  
 __| |_______________________________________| |__
 __   _______________________________________   __
   | |                                       | |  

EOF
echo -e "\e[0m"
}

MFS_MESSAGE(){
    echo -e "\e[31m"  
cat << "EOF"
         __
         ||
        (__)
  ____  ____  ____
 /\ M \/\ F \/\ S \
/  \___\ \___\ \___\
\  /   / /   / /   /
 \/___/\/___/\/___/    

EOF
echo -e "\e[0m"  # Reset color
    
    }

message_open_directory() {
     log_info "¿Desea abrir el directorio actual?:"
    printf "\t[s/n]: "
    read open_directory
    case "$open_directory" in
        [sS])
            log_success "Abriendo el directorio ..."
            explorer .
            ;;
        *)
        log_success "Proceso completado." 
            ;;
    esac
    exit 0
}
help() {
    show_usage
    log_info "¿Desea leer el README?:"
    printf "\t[s/n]: "
    read open_directory
    case "$open_directory" in
        [sS])
            # cd $INSTALL_DIR && start bash -c "less README.md"     
            cd $INSTALL_DIR && code README.md     
            log_success 'Consultando el archivo README.md '
            ;;
        *)
    exit 0
            ;;
    esac






}
