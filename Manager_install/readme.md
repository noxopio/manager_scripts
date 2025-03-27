# 🚀 Manager Repo - Gestión de Microfrontends en Paralelo

**Versión 5.0.1** - Ejecución de procesos en paralelo y gestión de procesos de Node en ejecución.

Este script ha sido diseñado para simplificar la gestión de múltiples repositorios y microfrontends (Mf).\
Permite realizar tareas comunes, como iniciar, clonar o detener los microfrontends, de manera eficiente.

> **Nota:** El script debe ser ejecutado desde la línea de comandos
>
> ```bash
> bash manager_repo.sh help 
> ```

---

## 📌 Notas de Uso

### 📌 Requisitos

El script requiere al menos un argumento:

- El primer argumento debe ser el comando a ejecutar:
  - `pull`, `run`, `install`, `updeps`, `list`, `ps`, `uninstall_managerr`, `help`
- El segundo argumento corresponde al archivo que contiene las URLs de los repositorios.

### 📌 Archivo de Repositorios

- Si no se proporciona un archivo, el script buscará uno llamado `listRep.txt` en directorio actual.
- Si no se encuentra el archivo, se mostrará un mensaje de error y la ejecución se detendrá.
- Si el archivo `listRep.txt` está en un directorio diferente o tiene otro nombre, se debe especificar el nombre del archivo o la ruta completa en el segundo argumento.

### 📝 Formato del Archivo `listRep.txt`

El archivo `listRep.txt` (nombre por defecto) debe contener las URLs de los repositorios, una por línea.\
No deben existir espacios el final del cada url,en la ultima debe existir un salto de linea
Los comentarios (líneas que comienzan con `#`) y los repositorios marcados con `#EXCLUDE` serán ignorados.

#### ➡ Ejemplo de `listRep.txt`

```text
https://github.com/usuario/repo1.git #NEW
https://github.com/usuario/repo2.git
https://github.com/usuario/repo3.git #EXCLUDE
https://github.com/usuario/repo3.git npm run dev  #NEW
https://github.com/usuario/repo3.git npm run dev 



```
---
➡ Ejemplo de uso


> [!NOTE] 
> 
> Muestra ejemplos de uso 
>```bash
>./manager_repo.sh help
>```
---


🔄 pull - Clonar o actualizar los repositorios
```bash

./manager_repo.sh pull listRep.txt
```
>[!NOTE]
> Clon parcial de los repositorios.  
> Usa git pull --unshallow   para obtener el historial completo.
>```bash
> git pull --unshallow 
>```
---
➡ Uso de una Rama Personalizada
>[!NOTE]
>Se puede especificar una rama mediante la opción -b.
>Si no se especifica una rama, el script usará develop por defecto.
>
>➡ Ejemplo
>```bash
>./manager_repo.sh -b fix/branch pull listRep.txt
>```
>En este ejemplo, el script ejecutará pull en todos los repositorios usando la rama fix/branch en lugar de develop.

---

➡ install - Instalar las dependencias
```bash
./manager_repo.sh install listRep.txt
```
---
➡ run - Ejecutar los microfrontends
```bash
./manager_repo.sh run 
```
---
>[!NOTE]
>⬆️ updeps - Actualizar dependencias
>```bash
>./manager_repo.sh updeps listRep.txt
>```
> Reinstala las dependencias.

---
>[!NOTE]
>➡ ps - Lista  procesos en ejecución
>```bash
>bash manager_repo.sh ps
>```
>Lista los proceso de node
---

>[!NOTE]
>❌ kill - Detener procesos en ejecución
>```bash
>bash manager_repo.sh kill
>```
>Este comando detiene todos los procesos de node en ejecucion.
---

❌ 
Matar un puerto específico:
```bash
npx kill-port 4200
 ```


---
---
---
>[!IMPORTANT]
>### INSTALACIÓN
>
>📦 Abre el archivo  manager_install.sh y revisa la descripción o ejecuta:
>
>```bash
>./manager_install.sh
>```

>[!NOTE]
 Este script se encarga de instalar los scripts de gestión de repositorios
 en un directorio específico y configurar alias en el archivo .bashrc para
 facilitar su uso. También se asegura de que los scripts tengan permisos
 de ejecución.


>[!NOTE]✔ Uso del Alias mfs
>Una vez instalado el gestor, puedes usar el alias mfs en lugar de manager_repo.sh.


## 🛠️ Comandos disponibles:

➡Ver ejemplos de modo de uso.
```bash
mfs help
```

➡Crear el archivo de repositorios
```bash
mfs list
```
>[!WARNING]
 >Este comando modifica el archivo listRep.txt en el directorio actual.
 >
 >Si el usuario asi lo requiere se crea un archivo vacio.
 >
 >Asegúrate de que el token de acceso tenga los permisos necesarios para acceder
 >a los repositorios privados, si es aplicable.


➡Ejecutar microfrontends
```bash
mfs run
```

➡ Hacer pull de los repositorios
```bash
mfs pull listRep.txt
```
>[!TIP]
> con el comado border  en false se puede desactivar los bordes alrededor de los mensjaes .
> ```bash
> mfs border  
>```
> opciones true false.

> [!IMPORTANT]
>➡Desinstalar manager_repo
>```bash
>mfs uninstall_manager
>```

>[!CAUTION] 
>Este comando ejecuta el script que se encarga de desinstalar el directorio de scripts de gestión
> y eliminar las funciones asociadas del archivo .bashrc. \
> Se asegura de que no queden residuos de la instalación.
***
***
>[!NOTE] Notas Adicionales
>Dependencias: Asegúrate de tener instalados los comandos y herramientas necesarias tales como  npm, git.

 ---
>[!TIP]
 ____Eliminar la carpeta node_modules innecesarias,con la herramienta npkill de npm .
 Esto es útil para liberar espacio en disco.____

```bash
npx npkill
```



>[!TIP]
>Remover archivos no ratreados 
>```bash
> git clean -fn
>```
> 

