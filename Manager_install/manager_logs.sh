## Colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
CIAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"

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
           echo -e "\n${color}${message}{RESET}\n"
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
    local message="[DESCRIPCIÓN] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$GREEN" "$message"
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

message(){
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