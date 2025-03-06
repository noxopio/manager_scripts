#!/bin/bash
# Documentación del Script
# ==========================
# Script de Desinstalación de Manager Scripts
# Versión: 1.0
# Fecha: [27-02-2025]
#
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  
#   | |                                       | |  
#   | |  888b     d888 8888888888  .d8888b.   | |  
#   | |  8888b   d8888 888        d88P  Y88b  | |  
#   | |  88888b.d88888 888        Y88b.       | |  
#   | |  88BYE8888P888 4048888     "Y888b.    | |  
#   | |  888 Y888P 888 888            "Y88b.  | |  
#   | |  888  Y8P  888 888              "888  | |  
#   | |  888   "   888 888        Y88b  d88P  | |  
#   | |  888       888 888         "Y8888P"   | |  
#   | |                                       | |  
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  


# Descripción:
# Este script se encarga de desinstalar el directorio de scripts de gestión
# y eliminar las funciones asociadas del archivo .bashrc. 
# Se asegura de que no queden residuos de la instalación anterior.
#
# Funcionalidades:
# - Elimina la carpeta de instalación si existe.
# - Elimina las funciones de Manager Scripts del archivo .bashrc.
# - Muestra mensajes informativos y de advertencia durante el proceso.
#
# Uso:
# Para ejecutar este script, simplemente utiliza el siguiente comando en la terminal:
#  ./manager_uninstall.sh o con el alias de  mfs  manager_uninstall
#

# Notas:
# - Este script modifica el archivo .bashrc, por lo que se recomienda hacer
#   una copia de seguridad de este archivo antes de ejecutar el script.


# Definición de colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
CIAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"
file_name="$(basename "$0")"
# Funciones de registro
 message(){
        echo -e "\e[31m"  
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
  FDA                   |||             || ||      || ||
------------------------|||-------------||-||------||-||-------
                        |__>            || ||      || ||
EOF
echo -e "\e[0m"  # Reset color
 }

message_uninstall(){

echo -e "\e[31m"  
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
echo -e "\e[0m"  # Reset color


}


border() {
    local color="$1"
    local message="$2"
    local length=$(( ${#message} + 4 ))
    local border_line=$(printf '%0.s─' $(seq 1 $length))
    
    echo -e "${color}╭${border_line}╮"
    echo -e "│  ${message}  │"
    echo -e "╰${border_line}╯${RESET}"
}

# Funciones de logging mejoradas
log_info() {
    local message="[INFO] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$CIAN" "$message"
}

INSTALL_DATE=$(date +"%Y-%m-%d %H:%M:%S")  

log_warning() {
    local message="[WARNING] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$YELLOW" "$message"
}


log_info "Ejecutando $file_name"

# Definir la ruta donde se creó la carpeta para los scripts
INSTALL_DIR="$HOME/manager_scripts"
ALIAS_FILE="$HOME/.bashrc"

# Eliminar la carpeta de instalación si existe
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    log_info "Carpeta eliminada: $INSTALL_DIR"
else
    log_warning "La carpeta no existe: $INSTALL_DIR"
    message
fi

remove_functions() {
    if grep -q "# >>> Manager Scripts START" "$ALIAS_FILE"; then
        # Eliminar el bloque completo
        sed -i "/# >>> Manager Scripts START/,/# <<< Manager Scripts END/d" "$ALIAS_FILE"
        log_info "Funciones de Manager Scripts eliminado del archivo: $ALIAS_FILE"
    else
        log_warning "No se encontraron  funciones de Manager Scripts en: $ALIAS_FILE"
        exit 1
    fi
}

remove_functions

source ~/.bashrc

log_info "Desinstalación completada."
message_uninstall
log_warning "$INSTALL_DATE" "no-prefix"	
