# ShiftFlow - Gestión de Turnos & Dashboards

Esta es una Aplicación Web Progresiva (PWA) diseñada para gestionar cambios de turno con evidencia fotográfica y generar visualizaciones automáticas desde archivos Excel.

## 🚀 Cómo empezar

Debido a restricciones de permisos en el entorno de ejecución, he creado la estructura completa en tu escritorio. Para ponerla en marcha, sigue estos pasos:

1.  Abre una terminal (PowerShell o CMD) en la carpeta del proyecto:
    ```bash
    cd "C:\Users\cristtapia\Desktop\shiftflow-app"
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```

## 🛠️ Características

- **Diseño Premium**: Interfaz moderna con Glassmorphism y Dark Mode.
- **Formulario de Turno**:
  - Registro de supervisor y fecha.
  - Área de texto para novedades.
  - **Carga de imágenes**: Previsualización instantánea de fotos adjuntas.
- **Motor de Dashboards**:
  - Sube un archivo `.xlsx` o `.xls`.
  - Generación automática de gráficos de barras y líneas.
  - KPIs de rendimiento integrados.
- **Soporte PWA**: Listo para ser instalado en dispositivos móviles o escritorio.

## 📦 Tecnologías utilizadas

- **Vite + React + TypeScript**
- **Vanilla CSS** (Diseño personalizado)
- **Lucide React** (Iconografía)
- **Recharts** (Visualización de datos)
- **SheetJS (xlsx)** (Procesamiento de Excel)

## 🌐 Despliegue en Vercel

Para desplegarlo en Vercel y conectarlo con GitHub:
1. Sube este código a un nuevo repositorio en GitHub.
2. En Vercel, selecciona "New Project" e importa el repositorio.
3. Vercel detectará automáticamente que es un proyecto Vite y lo desplegará.
