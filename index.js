import express from "express"
import 'dotenv/config'
import cors from "cors"
import {MongoClient, ObjectId} from "mongodb"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const app = express()
const port = process.env.port || 5000;

app.use(express.json())
app.use(cors())

// MongoDB things 
const client = new MongoClient(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nphrpiz.mongodb.net/`)

export const ConnectToMongoDB = async () => {
    try {
        await client.connect()
        console.log("You successfully connected to MongoDB!");
        return client
    } catch (error) {
        console.log(error);
        
    }
}

const connectedClient = await ConnectToMongoDB();

const MentorLagbeDB = await connectedClient.db("MentorLagbeDB");

const users = await MentorLagbeDB.collection("user")

const tuitions = await MentorLagbeDB.collection("tuitions")

const applications = await MentorLagbeDB.collection("applications")

const payments = await MentorLagbeDB.collection("payments");

app.get("/", (req, res)=>{
   res.send(`The serer is running successfully on port ${port}`)
})
// 

app.get("/user/:id/subscription" , async (req, res)=>{
   const { id } = req.params;
   const query = { _id : new ObjectId(id)};
    const result = await users.findOne(query);

   console.log(result);
   
   res.send(result)
})

// tuitions
app.post("/create-tuitions", async (req ,res)=>{
   const body = req.body;
   const result = await tuitions.insertOne(body);
   res.status(200).send({message : "you created a tuition successfully", result})
})

app.get("/tuitions", async (req, res)=>{
   const cursor =  tuitions.find()
   const result = await cursor.toArray();
   res.status(201).send(result)
})

app.get("/tuitions/:id", async (req, res)=>{
   const { id } = req.params;
   const query = { tutorId : id }
    const cursor =  tuitions.find(query)
   const result = await cursor.toArray();
   res.status(201).send(result)
})

app.get("/one-Tuition-by-Id/:id", async(req , res)=>{
    const { id } = req.params;
    const query = { _id : new ObjectId(id) };
    const result = await tuitions.findOne(query);
    res.status(201).send(result)
})


app.get("/brows-tuition" , async (req , res)=> {
   
    const query = {}

    if(req.query.classLevel){
        query.classLevel = req.query.classLevel
    }

    if(req.query.subject){
        query.subject = req.query.subject
    }

    if(req.query.mode){
        query.mode = req.query.mode
    }

    if(req.query.search){
        query.$or = [
            { title : { $regex :  req.query.search , $options : "i"}},
            { description : { $regex : req.query.search , $options : "i" }}
        ]
    }
   
    const cursor = tuitions.find(query)
   const result = await cursor.toArray();
   res.status(201).send(result)
})

app.patch("/tuition/:id", async (req, res)=>{
    const { id } = req.params;
    const updateBody = req.body
    
    const updateResult = await tuitions.updateOne(
        { _id : new ObjectId(id)},
        { $set : updateBody }
    );
    
    res.status(201).send(updateResult)
})

app.delete("/tuition-delete/:id", async(req ,res)=> {
     const { id } = req.params
     const query = { _id : new ObjectId(id)};
     const result = await tuitions.deleteOne(query);
     res.status(201).send(result)
})
 
// application 

app.post("/create-application", async (req, res)=>{
   const body = req.body;
   
   const existingCurrentapplication = await applications.findOne(
     { 
       studentId : req.body.studentId ,
       title : req.body.title 
     },
   )
    
   if(existingCurrentapplication){
      res.status(409).send({message : "you already applied the current tuition"});
      console.log("you already applied the current tuition");
      
      return
   }
   const result = await applications.insertOne(body);
   res.status(201).send(result)
})

// current-user-application 
app.get("/myApplications/:id", async (req, res) =>{
    const { id } = req.params;
    const query = { studentId : id };
    const result = await applications.find(query).toArray();
    res.status(200).send(result) 
})

// payments 

app.post("/payments/checkout-verify", async (req, res)=>{
     const { session_id } = req.body;

     if(!session_id){
        return res.send({ status : false , message : "Session ID is required"})
     }

     const {
     status,
    metadata ,
    customer_email ,
    payment_intent,
    payment_status
     } = await stripe.checkout.sessions.retrieve(session_id)
       

     if(status === "complete" && payment_status === "paid"){
      
        const sessionQuery = { session_id } 

        const existingPayment = await payments.findOne(sessionQuery);
        if(existingPayment){
            return res.send({ status : false , message : 'Payment already verified'})
        }
        
        const payment = {
        session_id,
        status,
        payment_status,
        userId : metadata.userId,
        customer_email,
        payment_intent,
        payment_date : new Date(),
     }

     const result = await payments.insertOne(payment);

     const query = { _id : new ObjectId(metadata.userId)}

    const updateDoc = {
        $set : {
             subscription : "paid"
        }
     }
     
     const updateResult = await users.updateOne(
        query,
        updateDoc
     )
      res.send({success: true, result, updateResult });
      return
     }
     res.send({ success: false, message: 'Payment verification failed'})
       })

app.listen(port, ()=>{
    console.log(`thie server is running on port ${port}`);
    
})

