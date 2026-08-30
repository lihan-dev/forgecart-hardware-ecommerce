# ForgeCart — Computer Hardware E-commerce Platform

ForgeCart is a final-year software engineering project that implements a specialised computer-hardware e-commerce prototype with a lightweight content-based recommendation system.

The application combines a React customer interface, a separate administrator interface, a Node.js/Express backend, MongoDB Atlas persistence, JWT-based authentication, and an offline Python/Scikit-learn recommendation pipeline.

## Project Features

- Customer registration and login
- JWT authentication and role-based administrator authorisation
- Computer-hardware product catalogue
- Product search, category filtering, and sorting
- Product detail and technical specification display
- Persistent shopping cart for authenticated users
- Non-financial order creation
- Administrator product creation, updating, and deletion
- Administrator order viewing
- Rule-based Hardware Assistant for basic category and budget requests
- Content-based product recommendations using TF-IDF and cosine similarity
- Same-category recommendation filtering
- Precomputed recommendation mappings served through the backend API
- Offline recommendation evaluation using Precision@3, Recall@3, and nDCG@3

## Technology Stack

### Frontend
- React 18 loaded using UMD CDN builds
- HTML5
- CSS3
- JavaScript
- Browser `fetch()` API
- React local state with `useState`

### Backend
- Node.js 24.16.0
- Express.js 5.2.1
- MongoDB Node.js Driver 7.6.0
- jsonwebtoken 9.0.3
- bcryptjs 3.0.3

### Database
- MongoDB Atlas
- Database: `hardware_store`
- Collections: `users`, `products`, `carts`, `orders`

### Recommendation Component
- Python 3.13.15
- Scikit-learn 1.9.0
- `TfidfVectorizer(stop_words="english")`
- Cosine similarity

## Repository Structure

```text
hardware-mvp/
├── ai/
│   ├── evaluate.py
│   ├── recommend.py
│   └── requirements.txt
├── backend/
│   ├── data/
│   │   └── products.json
│   ├── .env.example
│   ├── admin-login.test.js
│   ├── package.json
│   ├── package-lock.json
│   ├── recommendations.json
│   ├── seed.js
│   └── server.js
├── frontend/
│   ├── admin.html
│   ├── admin.js
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <repository-folder>
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Copy `backend/.env.example` to `backend/.env` and replace the placeholder values with your own private configuration.

Example:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?appName=<app-name>
MONGODB_DB=hardware_store
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:5000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

**Never commit `backend/.env` or expose database credentials, JWT secrets, or real administrator passwords.**

### 4. Seed the product catalogue

From the `backend` folder:

```bash
npm run seed
```

### 5. Generate product recommendations

Open another terminal:

```bash
cd ai
python -m pip install -r requirements.txt
python recommend.py
```

This generates the precomputed recommendation mappings in:

```text
backend/recommendations.json
```

### 6. Start the application

From the `backend` folder:

```bash
npm start
```

Then open:

```text
http://localhost:5000
```

Administrator interface:

```text
http://localhost:5000/admin.html
```

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a customer |
| POST | `/api/auth/login` | Authenticate user and issue JWT |
| GET | `/api/products` | Browse/search/filter/sort products |
| GET | `/api/products/:productCode` | Retrieve product details |
| GET | `/api/cart` | Retrieve authenticated user's cart |
| PUT | `/api/cart` | Persist authenticated user's cart |
| POST | `/api/orders` | Create a non-financial order |
| POST | `/api/admin/products` | Create a product as administrator |
| PATCH | `/api/admin/products/:productCode` | Update a product as administrator |
| DELETE | `/api/admin/products/:productCode` | Delete a product as administrator |
| GET | `/api/admin/orders` | View stored orders as administrator |
| GET | `/api/recommendations/:productCode` | Retrieve related products |
| POST | `/api/chat` | Rule-based hardware/category assistant |
| GET | `/api/health` | Server and MongoDB health check |

## Recommendation Method

The recommendation process runs offline rather than recalculating similarities for every HTTP request.

For each product, the system combines:

- name
- brand
- category
- description
- specification key-value pairs

The combined text is converted into TF-IDF vectors. Cosine similarity is then calculated between products. Recommendation candidates are restricted to the same hardware category, the selected product is excluded, and up to three related products are stored in `backend/recommendations.json`.

The recommendations represent **similar or related products**. They do **not** guarantee hardware compatibility.

## Offline Evaluation

The included `ai/evaluate.py` script evaluates recommendation ranking using a same-category proxy relevance assumption on the prototype catalogue.

```bash
cd ai
python evaluate.py
```

Prototype evaluation results at `K = 3`:

- Precision@3: `0.611`
- Recall@3: `0.917`
- nDCG@3: `0.917`

These values are offline ranking metrics and should not be interpreted as general recommendation accuracy, user satisfaction, or compatibility validation.

## Scope and Limitations

The prototype does not implement:

- real payment processing
- shipping services
- a dedicated inventory stock-count API
- full computer-component compatibility validation
- side-by-side product comparison
- conversational LLM/NLP functionality
- Find My Phone functionality
- natural-language-to-SQL processing
- smartphone recommendation/ranking
- public production deployment

## Security Notes

- Passwords are hashed using bcryptjs with cost factor 12.
- JWTs use HS256 and expire after two hours.
- Administrator access is enforced on the backend using role checks.
- Environment variables and credentials must remain private and must never be committed to Git.

## Academic Project

This repository contains the implementation developed for the final-year project:

**Development of a Specialized Computer Hardware E-commerce Platform with Intelligent Content-Based Recommendation Systems**

The repository is intended to provide implementation evidence corresponding to the dissertation and should be read together with the final submitted dissertation.

## Author

K.A. Lihan Amalsha  
BSc Software Engineering Final-Year Project
