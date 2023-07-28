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

        app.get('/api/v1/users/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email: email })
            res.send(result);
        });

        app.post('/api/v1/users', async (req, res) => {
            const user = req.body;
            user.wishlist = [];
            user.readinglist = [];
            user.total_books = 0;
            const result = await usersCollection.insertOne(user)
            res.send(result);
        });

        // app.patch('/api/v1/user/:email', async (req, res) => {
        //     const { email } = req.params;
        //     // const { book } = req.body;

        //     console.log(email);
        //     // const result = await booksCollection.findOneAndUpdate({ _id: new ObjectId(id) }, {
        //     //     $set: {
        //     //         book_name: data?.book_name,
        //     //         genre: data?.genre,
        //     //         description: data?.description
        //     //     }
        //     // });
        //     // if (result?.lastErrorObject?.updatedExisting) {
        //     //     res.json({ statusCode: 200, message: '📖 Book Edited Successfully! 🆗' });
        //     // } else {
        //     //     res.json({ statusCode: 422, message: 'Something went wrong! 🚫' });
        //     // }
        // });

        // INFO: books
        app.get('/api/v1/books', async (req, res) => {
            const result = await booksCollection.find({}).toArray();
            res.send(result);
        });

        app.get('/api/v1/book/:id', async (req, res) => {
            const id = req.params.id;
            const result = await booksCollection.find({ _id: new ObjectId(id) }).toArray();
            res.send(result);
        })

        app.post('/api/v1/books', async (req, res) => {
            const book = req.body;
            book.publish_date = new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            })
            const userEmail = book.author_email;
            const user = await usersCollection.findOne({ email: userEmail });
            user.total_books += 1;
            const result = await booksCollection.insertOne(book);
            res.send(result);
        })

        app.patch('/api/v1/book/edit/:id', async (req, res) => {
            const { id } = req.params;
            const { data } = req.body;

            const result = await booksCollection.findOneAndUpdate({ _id: new ObjectId(id) }, {
                $set: {
                    book_name: data?.book_name,
                    genre: data?.genre,
                    description: data?.description
                }
            });
            if (result?.lastErrorObject?.updatedExisting) {
                res.json({ statusCode: 200, message: '📖 Book Edited Successfully! 🆗' });
            } else {
                res.json({ statusCode: 422, message: 'Something went wrong! 🚫' });
            }
        });

        app.delete('/api/v1/book/delete/:id', async (req, res) => {
            const { id } = req.params;

            const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
            if (result?.deletedCount) {
                res.json({ statusCode: 200, message: '📖 Book Deleted Successfully! 🆗' });
            } else {
                res.json({ statusCode: 422, message: 'Something went wrong! 🚫' });
            }
        })

        app.post('/api/v1/book/:email', async (req, res) => {
            const { email } = req.params;
            const { book } = req.body;
            const { cart } = req.query;

            if (cart === "wishlist") {
                const userWishlist = await usersCollection.findOne({ email: email });

                const exists =
                    userWishlist?.wishlist?.find((bk) => bk?._id === book._id) !== undefined;

                if (exists) {
                    res.json({ statusCode: 409, message: 'Book already in your wishlist!' });
                } else {
                    const result = await usersCollection.updateOne(
                        { email: email },
                        { $push: { wishlist: book } }
                    );

                    if (result.modifiedCount !== 1) {
                        console.error('Book not found or not added');
                        res.json({ error: 'Book not found or not added' });
                        return;
                    }

                    res.json({ statusCode: 200, message: 'Book added successfully to your wishlist' });
                }
            } else if (cart === "readinglist") {
                const userWishlist = await usersCollection.findOne({ email: email });

                const exists =
                    userWishlist?.readinglist?.find((bk) => bk?._id === book._id) !== undefined;

                if (exists) {
                    res.json({ statusCode: 409, message: 'Book already in your readinglist!' });
                } else {
                    const result = await usersCollection.updateOne(
                        { email: email },
                        { $push: { readinglist: book } }
                    );

                    if (result.modifiedCount !== 1) {
                        console.error('Book not found or not added');
                        res.json({ error: 'Book not found or not added' });
                        return;
                    }

                    res.json({ statusCode: 200, message: 'Book added successfully to your readinglist!' });
                }
            }
        });


        // INFO: Comments
        app.get('/api/v1/comment/:id', async (req, res) => {
            const productId = req.params.id;

            const result = await booksCollection.findOne(
                { _id: new ObjectId(productId) },
                { projection: { _id: 0, reviews: 1 } }
            );

            if (result) {
                res.json(result);
            } else {
                res.status(404).json({ error: 'Product not found' });
            }
        });

        app.post('/api/v1/comment/:id', async (req, res) => {
            const bookId = req.params.id;
            const comment = req.body.comment;

            const result = await booksCollection.updateOne(
                { _id: new ObjectId(bookId) },
                { $push: { reviews: comment } }
            );

            if (result.modifiedCount !== 1) {
                console.error('Product not found or comment not added');
                res.json({ error: 'Product not found or comment not added' });
                return;
            }

            res.json({ statusCode: 200, message: 'Comment added successfully' });
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