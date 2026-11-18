import express from "express"
import 'dotenv/config'
import cors from "cors"
import {MongoClient} from "mongodb"

const app = express()
const port = process.env.port || "5000"

app.use(cors())
app.use(express.json())

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


app.get("/", (req, res)=>{
   res.send(`The serer is running successfully on port ${port}`)
})

app.listen(port, ()=>{
    console.log(`thie server is running on port ${port}`);
    
})

