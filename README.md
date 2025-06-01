# ❤️ HeartSync Backend API

Una API backend moderna y escalable construida con Express.js, diseñada para potenciar una aplicación de citas y redes sociales.

## ✨ Descripción

Este proyecto proporciona una infraestructura backend robusta para HeartSync, una aplicación enfocada en conectar personas mediante intereses y preferencias compartidas. Utiliza tecnologías de vanguardia para garantizar un rendimiento óptimo, seguridad y escalabilidad.

---

  

## 🚀 Instalación

  

Sigue estos pasos para ejecutar el proyecto localmente:

  

1. ⬇️ **Clonar el repositorio**

  

```bash

git clone https://github.com/PabloVS044/heartSync-backend.git

```

  

2. 📁 **Entrar en el directorio del proyecto**

  

```bash

cd  heartSync-backend

```

  

3. 📦 **Instalar dependencias**

  

```bash

npm  install

```

  

4. ⚙️ **Configurar variables de entorno**

  

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

  

```env

    PORT=tu_puerto

    NEO4J_URI=tu_uri_de_neo4j

    NEO4J_USER=tu_usuario_de_neo4j

    NEO4J_PASSWORD=tu_contraseña_de_neo4j

    JWT_SECRET=tu_clave_secreta_jwt

    GOOGLE_CLIENT_ID=tu_id_de_cliente_google


```

  

5. ▶️ **Iniciar el servidor de desarrollo**

  

```bash

npm  run  dev

```

  

---

## 💻 Uso

<details>
<summary><strong>Endpoints de la API y ejemplos</strong></summary>

### Endpoints de Usuario

- **Crear usuario**:
  ```http
  POST /users
  Content-Type: application/json

  {
    "name": "Verónica",
    "surname": "Ríos",
    "email": "veronica9@example.com",
    "password": "123456",
    "age": 45,
    "country": "GT",
    "gender": "female",
    "interests": ["arte", "lectura", "viajar"],
    "photos": ["photo9.jpg"],
    "bio": "Apasionada por la vida.",
    "minAgePreference": 18,
    "maxAgePreference": 24
  }
  ```

- **Obtener usuario por ID**:
  ```http
  GET /users/:id
  Content-Type: application/json
  ```

### Endpoints de Anuncios

- **Crear anuncio**:
  ```http
  POST /ads
  Content-Type: application/json

  {
    "title": "Prueba 2",
    "description": "Probando relaciones de los ads",
    "image": "https://example.com/travel-ad.jpg",
    "targetedInterests": ["viajar", "comida", "lectura"]
  }
  ```

- **Obtener todos los anuncios**:
  ```http
  GET /ads
  Content-Type: application/json
  ```

### Endpoints de Chat

- **Obtener chat por ID**:
  ```http
  GET /chats/:chatId
  Content-Type: application/json
  ```

- **Enviar mensaje al chat**:
  ```http
  POST /chats/:chatId/messages
  Content-Type: application/json

  {
    "senderId": "userUUID",
    "content": "Hola, ¿cómo estás?",
    "image": "url_imagen_opcional"
  }
  ```

### Endpoints de Match

- **Obtener match por ID**:
  ```http
  GET /matches/:matchId
  Content-Type: application/json
  ```

- **Obtener matches de un usuario**:
  ```http
  GET /matches/user/:userId
  Content-Type: application/json
  ```
</details>

## ✨ Funcionalidades

- 👤 **Gestión de usuarios**: Crear, actualizar y gestionar perfiles de usuario.
- 💘 **Emparejamiento**: Algoritmo de match basado en intereses compartidos.
- 💬 **Chat en tiempo real**: Funcionalidad de mensajería instantánea con Socket.IO.
- 📢 **Publicidad dirigida**: Anuncios personalizados según los intereses de los usuarios.
- 🔒 **Autenticación segura**: JWT y Google OAuth para acceso protegido.
- 📊 **Alta escalabilidad**: Neo4j como base de datos de grafos para relaciones complejas.

## 🚀 Tecnologías Utilizadas

| Tecnología   | Descripción                                    | Enlace                                  |
|--------------|------------------------------------------------|-----------------------------------------|
| Express.js   | Framework backend para construir APIs          | [Express.js](https://expressjs.com/)   |
| Neo4j        | Base de datos de grafos                        | [Neo4j](https://neo4j.com/)             |
| Socket.IO    | Comunicación en tiempo real                    | [Socket.IO](https://socket.io/)         |
| Bcrypt       | Cifrado de contraseñas                         | [Bcrypt](https://www.npmjs.com/package/bcrypt) |
| JWT          | Autenticación con tokens                       | [JWT](https://jwt.io/)                  |
| Google Auth Library | Inicio de sesión con Google           | [Google Auth](https://developers.google.com/identity/gsi/web/libraries) |
| Morgan       | Middleware de logs HTTP                        | [Morgan](https://www.npmjs.com/package/morgan) |
| Cors         | Middleware para habilitar CORS                 | [Cors](https://www.npmjs.com/package/cors) |
| Dotenv       | Variables de entorno                           | [Dotenv](https://www.npmjs.com/package/dotenv) |
| Express Validator | Validación de datos                    | [Validator](https://www.npmjs.com/package/express-validator) |

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Puedes ayudar de las siguientes maneras:

- 🐛 **Reporta errores**: Describe el problema en detalle.
- 💡 **Sugiere mejoras**: Propón nuevas funcionalidades o mejoras.
- 🛠️ **Envía Pull Requests**: Comparte tus cambios siguiendo las normas del proyecto.

## 📝 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).

## 👨‍💻 Información del Autor

- **PabloVS044**:
  - [GitHub](https://github.com/PabloVS044)

