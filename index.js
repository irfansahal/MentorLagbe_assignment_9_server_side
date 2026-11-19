import express from "express"
import 'dotenv/config'
import cors from "cors"
import {MongoClient} from "mongodb"

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

const users = await MentorLagbeDB.collection("users")

const tuitions = await MentorLagbeDB.collection("tuitions")

app.get("/", (req, res)=>{
   res.send(`The serer is running successfully on port ${port}`)
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

app.listen(port, ()=>{
    console.log(`thie server is running on port ${port}`);
    
})

