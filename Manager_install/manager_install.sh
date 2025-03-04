#!/bin/bash

# Documentación del Script
# ==========================
# Script de Instalación de Manager Scripts
# Versión: 1.0
# Fecha: [27/02/2025]

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


# Descripción:
# Este script se encarga de instalar los scripts de gestión de repositorios
# en un directorio específico y configurar alias en el archivo .bashrc para
# facilitar su uso. También se asegura de que los scripts tengan permisos
# de ejecución y agrega información sobre la fecha de creación e instalación.
#
# Funcionalidades:
# - Crea un directorio para los scripts si no existe.
# - Copia los scripts necesarios al directorio de instalación.
# - Agrega la fecha de creación e instalación a los scripts.
# - Otorga permisos de ejecución a los scripts copiados.
# - Crea alias en el archivo .bashrc para facilitar el acceso a los scripts.
#
# Uso:
# Para ejecutar este script, simplemente utiliza el siguiente comando en la terminal:
#  ./manager_install.sh
#
# Requisitos:
# - El script debe tener permisos de ejecución. Puedes otorgar permisos con:
#   chmod +x manager_install.sh
#
# Notas:
# - Asegúrate de que los scripts que se van a copiar existan en el mismo directorio
#   que este script.
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

# Función de bordes mejorada (compartida)
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
log_info "INSTALANDO..."

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

# Definir la ruta donde se creará la carpeta para los scripts
INSTALL_DIR="$HOME/manager_scripts"
SOURCE_DIR="$(dirname "$0")" 
# Comprobar si se debe forzar la reinstalación
FORCE_REINSTALL=false


# Procesar argumentos
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE_REINSTALL=true ;;
        *) log_warning "Opción desconocida: $1" ;;
    esac
    shift
done

update_manager_repo() {

    log_info "Desinstalando ..."
    "$SOURCE_DIR/manager_uninstall.sh" "$@"
    
    log_info "Reinstalando ..."
    "$SOURCE_DIR/manager_install.sh" "$@"
}
# Crear la carpeta si no existe
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    log_info "Carpeta creada en $INSTALL_DIR" 
 
else
    log_warning " La carpeta ya existe en $INSTALL_DIR" 
    log_info "Para reinstalar ejecute: ./manager_install.sh --force" 
    if [ "$FORCE_REINSTALL" = true ]; then
    clear
        update_manager_repo
    fi
    exit 1
fi

# Copiar los scripts a la carpeta
# cp "$SOURCE_DIR/manager_repo.sh" "$INSTALL_DIR/"
# cp "$SOURCE_DIR/url_extractor.sh" "$INSTALL_DIR/"
# cp "$SOURCE_DIR/manager_uninstall.sh" "$INSTALL_DIR/"
# cp "$SOURCE_DIR/readme.md" "$INSTALL_DIR/"
cp -r "$SOURCE_DIR/"* "$INSTALL_DIR/"
log_info "Scripts copiados a $INSTALL_DIR"
# Agregar fecha y hora de creación y de instalación a los scripts
INSTALL_DATE=$(date +"%Y-%m-%d %H:%M:%S")  
for script in "$INSTALL_DIR/manager_repo.sh" "$INSTALL_DIR/url_extractor.sh" "$INSTALL_DIR/manager_uninstall.sh"; do
    echo -e "# Fecha de creación: 2025-02-27 \n# Fecha de instalación: $INSTALL_DATE\n" | cat - "$script" > temp && mv temp "$script"
   
done
# Dar permisos de ejecución a los scripts
chmod +x "$INSTALL_DIR/"*.sh
log_info "Permisos de ejecución otorgados a los scripts"

# Crear alias en .bashrc
ALIAS_FILE="$HOME/.bashrc"




# Verificar si los alias ya están en .bashrc
if ! grep -q "mfs()" "$ALIAS_FILE"; then
     log_info "Creando alias para manager y url_extractor en $ALIAS_FILE"
    
    cat << EOL >> "$ALIAS_FILE"
    # >>> Manager Scripts START
mfs() {
    $INSTALL_DIR/manager_repo.sh "\$@"
}

url_extractor() {
    $INSTALL_DIR/url_extractor.sh "\$@"
}
# <<< Manager Scripts END
EOL
else
   log_warning "Los alias ya existen en $ALIAS_FILE"
fi

update_bashrc() {
    source "$ALIAS_FILE"
    log_info "Archivo .bashrc actualizado"
}
# Mensaje final
log_info "Instalación completada exitosamente" 
log_info "Comandos disponibles:"
log_info "  mfs: Gestión de repositorios" 
log_info "  url_extractor: Extracción de URLs" 
update_bashrc
 log_info "Abriendo la carpeta de instalación..."
    message
log_warning "$INSTALL_DATE" "no-prefix"	
cd "$INSTALL_DIR" && explorer .

