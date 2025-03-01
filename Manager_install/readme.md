#!/bin/bash
# Versión 5.0.1 - Ejecución de procesos en paralelo y gestión de procesos de Node en ejecución

## Notas de Uso

Este script ha sido diseñado para simplificar la gestión de múltiples repositorios y microfrontends (Mf). Permite realizar tareas comunes, como iniciar, clonar o detener los microfrontends, de manera más eficiente.
# El script debe ser ejecutado desde la línea de comandos
```bash
bash manager_repo.sh
```

- **Requisitos**: El script requiere al menos un argumento:
  - El primer argumento debe ser el comando a ejecutar (`pull`, `run`, `install`, `updeps`, `list`, `ps`,`uninstall_managerr`).
  - El segundo argumento  corresponde al archivo que contiene las URLs de los repositorios.

- **Archivo de Repositorios**: 
  - Si no se proporciona un archivo, el script buscará uno llamado `listRep.txt` en el mismo directorio.
  - Si no se encuentra el archivo, se mostrará un mensaje de error y la ejecución se detendrá.
  - Si el archivo `listRep.txt` está en un directorio diferente o tiene otro nombre, se debe especificar el nombre del archivo o la ruta completa en el segundo argumento.
  
    **Formato del Archivo listRep.txt**
    
    El archivo listRep.txt (nombre por defecto) debe contener las URLs de los repositorios, una por línea. Los comentarios (líneas que comienzan con #) y los repositorios marcados con #EXCLUDE serán ignorados.

    ####  Ejemplo de archivo listRep.txt:
    - https://github.com/usuario/repo1.git
    - https://github.com/usuario/repo2.git
    - https://github.com/usuario/repo3.git #EXCLUDE
  

  **Ejemplo**: 
  ```bash
  ./manager_repo.sh pull /listas/urlsRepos.txt
  ```
  **Uso del Script**
      
  **Pull**
     : Para clonar o actualizar los repositorios.
     ```bash
     ./manager_repo.sh pull listRep.txt
     ```
    **Run**: Para ejecutar los microfrontends.
     ```bash
     ./manager_repo.sh run listRep.txt
     ```
    **Install**: Instala las dependencias.
     ```bash
     ./manager_repo.sh install listRep.txt
     ```
    **Updeps**: Instala las dependencias.
     ```bash
     ./manager_repo.sh install listRep.txt
     ```
  
    **Kill**: Instala las dependencias.
     ```bash
    bash manager_repo.sh kill
     ```

  

  **Uso de una Rama Personalizada**
-   Puedes especificar una rama para todas las operaciones mediante la opción -b. Si no se      especifica la rama, el script usará la rama predeterminada develop.

    **Ejemplo**: 

    ```bash
                ./manager_repo.sh -b fix/branch pull listRep.txt
     ```
- En este ejemplo, el script ejecutará el comando pull en todos los repositorios de la lista especificada en listRep.txt, utilizando la rama fix/branch en lugar de la rama predeterminada develop.

- Si no se usa la opción -b, el script usará la rama develop por defecto para todas las operaciones de git clone y git pull. Al ejecutar cualquiera de los comandos, el script mostrará el progreso y los resultados de cada operación en la terminal.

**Matar Procesos de Node**
- Matar un puerto específico con:

     ```bash
               npx kill-port 4200
     ```
- Para facilitar la tarea de matar procesos de Node, se puede crear un alias:

  ```bash
   alias toolKill='ps aux | grep "[n]ode" | awk '\''{print $1}'\'' && kill $(ps aux | grep "[n]ode" | awk '\''{print $1}'\'')'
  ```
- Luego, usar   el alias toolKill para terminar los procesos de Node en ejecución.

## para instalar 
- abre el script manager_install.sh  y lee la descripción 
- o ejecuta ./manager_install.sh
# Uso del Alias mfs
Una vez instalado el gestor, puedes utilizar el alias mfs en lugar de manager_repo.sh para ejecutar el script. Aquí tienes algunos ejemplos:
```  bash 
#Crear el archivo txt .
mfs list
```
```  bash 
# Correr los mf
mfs run 
```
```  bash 
# Hacer pull 
mfs pull listRep.txt
```
```  bash 
#Eliminar manager_repo
mfs uninstall_managerr 

```
