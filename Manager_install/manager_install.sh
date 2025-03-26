#!/bin/bash
set -e
# Documentación del Script
# ==========================
# Script de Instalación de Manager Scripts
# Versión: 2.0.1
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
# usa --help  para obtener más información.
# Requisitos:
# - El script debe tener permisos de ejecución. Puedes otorgar permisos con:
#   chmod +x manager_install.sh
#
# Notas:
# - Asegúrate de que los scripts que se van a copiar existan en el mismo directorio
#   que este script.
# - Este script modifica el archivo .bashrc, por lo que se recomienda hacer
#   una copia de seguridad de este archivo antes de ejecutar el script.
# - Si deseas forzar la reinstalación de los scripts, puedes utilizar la opción --force.
# - Para obtener más información, consulta el archivo README.md en el directorio de instalación.


source "$(dirname "$0")/manager_logs.sh"
SHOW_BORDER=true


INSTALL_DATE=$(date +"%Y-%m-%d %H:%M:%S")  
INSTALL_DIR="$HOME/manager_scripts"
SOURCE_DIR="$(dirname "$0")" 
FORCE_REINSTALL=false
HELP=false
ALIAS_FILE="$HOME/.bashrc"



help(){
 log_info "Uso: $0" "no-prefix"
    log_info "Este script instala los scripts de gestión de repositorios en un directorio específico y configura alias en el archivo .bashrc para facilitar su uso." "no-prefix"
    exit 1
}
update_manager_repo() {
    log_info "Desinstalando ..."
    "$SOURCE_DIR/manager_uninstall.sh" "$@"
    "$SOURCE_DIR/manager_install.sh" "$@"
}
# Procesar argumentos
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE_REINSTALL=true 
        ;;
        --help) HELP=true
        help
        ;;

        *) log_warning "Opción desconocida: $1"
        error_404
        exit 1 ;
         ;;
      
    esac
    shift
done
# Crear la carpeta si no existe
if [ ! -d "$INSTALL_DIR" ]; then
    log_info "INSTALANDO..."
    mkdir -p "$INSTALL_DIR"
    log_success "Carpeta creada en $INSTALL_DIR" 
else
    log_warning " La carpeta ya existe en $INSTALL_DIR" 
    log_info "Para reinstalar ejecute: ./manager_install.sh --force" 
    MFS_MANAGER
    log_warning "$INSTALL_DATE" "no-prefix"	
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
for script in "$INSTALL_DIR/manager_repo.sh" "$INSTALL_DIR/url_extractor.sh" "$INSTALL_DIR/manager_uninstall.sh"; do
    echo -e "# Fecha de creación: 2025-02-27 \n# Fecha de instalación: $INSTALL_DATE\n" | cat - "$script" > temp && mv temp "$script"
done
# Dar permisos de ejecución a los scripts
chmod +x "$INSTALL_DIR/"*.sh
log_info "Permisos de ejecución otorgados a los scripts"

# Verificar si los alias ya están en .bashrc
if ! grep -q "mfs()" "$ALIAS_FILE"; then
     log_info "Creando alias para manager en $ALIAS_FILE"
    
    cat << EOL >> "$ALIAS_FILE"
    # >>> Manager Scripts START
mfs() {
    $INSTALL_DIR/manager_repo.sh "\$@"
}

#Instalado en  $INSTALL_DATE
# <<< Manager Scripts END
EOL
else
   log_warning "Los alias ya existen en $ALIAS_FILE"
fi

update_bashrc() {
    source "$ALIAS_FILE"
     log_success "Archivo .bashrc actualizado"
}
# Mensaje final
update_bashrc
    log_info "mfs disponible en la terminal"
    log_info "Para más información, consulte el archivo README.md en $INSTALL_DIR"
    log_success "Instalación completada exitosamente" 
    # log_warning "Para reinstalar ejecute: ./manager_install.sh --force"
    MFS_MESSAGE
    log_warning "$INSTALL_DATE" "no-prefix"	
    log_info "¿Desea abrir la carpeta de instalación?"
# Abrir la carpeta de instalación
printf "\t[s/n]: "
read open_directory

    case "$open_directory" in
        [sS])
        log_info "Abriendo la carpeta de instalación..."
        cd "$INSTALL_DIR" && explorer .
    log_info "Puedes usar el comando   mfs help   para obtener ayuda"
        exit 1
            ;;
        *)
    log_info "Puedes usar el comando   mfs help   para obtener ayuda"
        exit 1
            ;;

    esac
