const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fus4ier.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("RentopiaDB").collection("users");
    const propertyCollection = client.db("RentopiaDB").collection("properties");
    const wishListCollection = client.db("RentopiaDB").collection("wishLists");

    // Jwt related api

    app.post('/jwt',(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
      res.send({token})
    })


    // user related api

    app.get('/users',async(req,res)=>{
      const result=await userCollection.find().toArray();
      res.send(result);
    })

    // app.get('/users/:email',async(req,res)=>{
    //   const email=req.params.email;
    //   const query={email:email}
    //   const result=await userCollection.findOne(query);
    //   res.send(result);
    // })
    app.get('/user',async(req,res)=>{
      const email=req.query.email;
      if(!email){
        res.send([]);
      }
      const query={email:email};
      const result=await userCollection.findOne(query);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.delete('/users/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await userCollection.deleteOne(query);
      res.send(result);
    })

    // property related api
    app.get('/property', async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    })

    app.get('/properties',async(req,res)=>{
      const name=req.query.name;
      const query={name:name};
      const result=await propertyCollection.find(query).toArray();
      res.send(result);
    })


    app.get('/property/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(filter);
      res.send(result);
    })


    app.post('/property', async (req, res) => {
      const newProperty = req.body;
      console.log(newProperty);
      const result = await propertyCollection.insertOne(newProperty);
      res.send(result);
    })

    app.delete('/property/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)};
      const result=await propertyCollection.deleteOne(query);
      res.send(result);
    })

    // wishlist collection

    app.get('/wishLists',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail=req.decoded.email;
      if(email !==decodedEmail){
        return res.status(403).send({error:true, message:'forbidden access'})
      }
      const query = { email: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);

    })

    app.post('/wishLists', async (req, res) => {
      const house = req.body;
      console.log(house);
      const result = await wishListCollection.insertOne(house);
      res.send(result);
    })

    app.delete('/wishLists/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Rentopia server running');
})

app.listen(port, () => {
  console.log(`Rentopia is running on port ${port}`);
})