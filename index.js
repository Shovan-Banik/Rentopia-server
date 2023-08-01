const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')
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


const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("RentopiaDB").collection("users");
    const propertyCollection = client.db("RentopiaDB").collection("properties");
    const wishListCollection = client.db("RentopiaDB").collection("wishLists");
    const bookingCollection = client.db("RentopiaDB").collection("bookings");
    

    // Jwt related api

    app.post('/jwt',(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
      res.send({token})
    })


    // user related api

    app.get('/users',verifyJWT,async(req,res)=>{
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

    // booking related api
    app.post('/bookings', async(req,res)=>{
      console.log(req.body);
      const booking=req.body;

      const selectedProperty=await wishListCollection.findOne({_id : new ObjectId(req.body.productId)});
      console.log(selectedProperty);

      const tran_id=new ObjectId().toString();

      const data = {
        total_amount: selectedProperty?.price,
        currency: booking.currency,
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: selectedProperty.category,
        product_profile: 'general',
        cus_name: booking.name,
        cus_email: booking.email,
        cus_add1: booking.location,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: booking.phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };

    console.log(data);

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({url:GatewayPageURL});

        const finalOrder={
          selectedProperty,
          paidStatus:false,
          transactionId:tran_id
        }
        const result=bookingCollection.insertOne(finalOrder);


        console.log('Redirecting to: ', GatewayPageURL)
    });
    app.post('/payment/success/:tranId',async(req,res)=>{
      console.log(req.params.tranId);
      const result=await bookingCollection.updateOne({transactionId:req.params.tranId},{
        $set:{
          paidStatus:true
        },
      })
      if(result.modifiedCount>0){
        res.redirect(`http://localhost:5173/dashboard/payment/success/${req.params.tranId}`)
      }

    })

    app.post('/payment/fail/:tranId',async(req,res)=>{
      const result=await bookingCollection.deleteOne({transactionId:req.params.tranId});
      if(result.deletedCount){
        res.redirect(`http://localhost:5173/dashboard/payment/fail/${req.params.tranId}`)
      }
    })

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