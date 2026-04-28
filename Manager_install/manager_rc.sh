#!/bin/bash
# manager_rc.sh — Funciones y alias del Manager Scripts
# Este archivo es cargado automáticamente por .bashrc mediante una línea source.
# No modifiques este archivo manualmente; es gestionado por manager_install.sh.

# ── Función principal del manager ────────────────────────────────────────────
mfs() {
    INSTALL_DIR/manager_repo.sh "$@"
}

# ── Aliases de navegación ─────────────────────────────────────────────────────
alias cdf='cdlist -f'   # Listar favoritas
alias cda='cdlist -a'   # Agregar ruta actual a favoritas
alias cdr='cdlist -r'   # Eliminar ruta de favoritas
alias cdl='cdlist'      # Navegar por directorios actuales

# ── Función cdlist ────────────────────────────────────────────────────────────
cdlist() {
  local RED="\e[31m"
  local GREEN="\e[32m"
  local YELLOW="\e[33m"
  local BLUE="\e[34m"
  local CIAN="\e[36m"
  local RESET="\e[0m"
  local FAVORITES_FILE="$HOME/.cdlist_favorites"

  [ -f "$FAVORITES_FILE" ] || touch "$FAVORITES_FILE"

  case "$1" in
    -a|--add)
      pwd >> "$FAVORITES_FILE"
      echo -e "${GREEN}✅ Ruta agregada a favoritas:${RESET} $(pwd)"
      return
      ;;
    -f|--favorites)
      mapfile -t favs < "$FAVORITES_FILE"
      if [ "${#favs[@]}" -eq 0 ]; then
        echo -e "${RED}❌ No hay rutas favoritas.${RESET}"
        return
      fi
      echo -e "${BLUE}⭐ Rutas favoritas:${RESET}"
      for i in "${!favs[@]}"; do
        printf "${CIAN}%3d)${RESET} ${YELLOW}%s${RESET}\n" $((i+1)) "${favs[$i]}"
      done
      echo -ne "${YELLOW}🔢 Elige una ruta: ${RESET}"
      read num
      local index=$((num-1))
      if [ "$index" -ge 0 ] && [ "$index" -lt "${#favs[@]}" ]; then
        cd "${favs[$index]}" || return
        echo -e "${GREEN}✅ Ahora estás en: $(pwd)${RESET}"
      else
        echo -e "${RED}❌ Número inválido.${RESET}"
      fi
      return
      ;;
    -r|--remove)
      mapfile -t favs < "$FAVORITES_FILE"
      echo -e "${BLUE}🗑️  Eliminar favorita:${RESET}"
      for i in "${!favs[@]}"; do
        printf "${CIAN}%3d)${RESET} ${YELLOW}%s${RESET}\n" $((i+1)) "${favs[$i]}"
      done
      echo -ne "${YELLOW}🔢 Selecciona una para eliminar: ${RESET}"
      read num
      local index=$((num-1))
      if [ "$index" -ge 0 ] && [ "$index" -lt "${#favs[@]}" ]; then
        unset 'favs[index]'
        printf "%s\n" "${favs[@]}" > "$FAVORITES_FILE"
        echo -e "${GREEN}✅ Favorita eliminada.${RESET}"
      else
        echo -e "${RED}❌ Número inválido.${RESET}"
      fi
      return
      ;;
  esac

  echo -e "${BLUE}📁 Directorios disponibles:${RESET}"
  local dirs=($(ls -d */ 2>/dev/null))
  if [ "${#dirs[@]}" -eq 0 ]; then
    echo -e "${RED}❌ No hay directorios.${RESET}"
    return
  fi
  for i in "${!dirs[@]}"; do
    printf "${CIAN}%3d)${RESET} ${YELLOW}%s${RESET}\n" $((i+1)) "${dirs[$i]}"
  done
  echo -ne "${YELLOW}🔢 Ingresa el número del directorio: ${RESET}"
  read num
  local index=$((num-1))
  if [ "$index" -ge 0 ] && [ "$index" -lt "${#dirs[@]}" ]; then
    cd "${dirs[$index]}"
    echo -e "${GREEN}✅ Ahora estás en: $(pwd)${RESET}"
  else
    echo -e "${RED}❌ Número inválido.${RESET}"
  fi
}
