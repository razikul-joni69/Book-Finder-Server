require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 8000;

const cors = require('cors');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@projectscluster.sralaww.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

const main = async () => {
    try {
        await client.connect();
        console.log('Database Connected successfully 🆗');

        const usersCollection = client.db('book-finder').collection('users');
        const booksCollection = client.db('book-finder').collection('books');

        // INFO: users
        app.get('/api/v1/users', async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            res.send(result);
        });

        
    } finally {
        // await client.close();
    }
}

main().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Book Finder Server is Running...');
});

app.listen(port, () => {
    console.log(`Book Finder app listening on port ${port}`);
});