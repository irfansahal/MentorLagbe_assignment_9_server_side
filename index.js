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
const sessions = await MentorLagbeDB.collection("session");


const verifyToken = async (req, res, next) => {
  
  const auhtHeader = req.headers.authorization;
  
  if(!auhtHeader){
      res.status(401).send({massage : "Unauthorized" })
      return
    }
 
  const token = auhtHeader.split(" ")[1]

     if(!token){
      res.status(401).send({ message : "Unauthorized"})
      return
     }

    const query = { token }

    const session = await sessions.findOne(query);

    if(!session){
        res.status(401).send({ meassage : "Unauthorized"})
        return 
    }

    const userId = session.userId

    const userQuery = { _id : new ObjectId(userId) }
    
    const user = await users.findOne(userQuery)
    
    if(!user){
        res.status(401).send({ message : "Unauthorized" })
    }
  
    req.user = user
  next()
  
}


app.get("/",(req, res)=>{
   res.send(`The serer is running successfully on port ${port}`)
})
// 

app.get("/all-user", async (req, res)=>{
    const cursor = users.find();
    const result = await cursor.toArray();
    res.send({result})
})

app.patch("/updating-a-user/:userId",verifyToken, async(req ,res)=>{
    const { userId } = req.params;
    const query = { _id : new ObjectId(userId) }
    const updateDoc = req.body;

    const updateResult = await users.updateOne(
        query,
        { $set : updateDoc }
    );

    res.send(updateResult)
})

app.get("/user/:id/subscription" , async (req, res)=>{
   const { id } = req.params;
   const query = { _id : new ObjectId(id)};
    const result = await users.findOne(query, {projection : { subscription : 1}});

   res.send(result)
})

// tuitions
app.post("/create-tuitions", verifyToken,async (req ,res)=>{
   const body = req.body;
   const result = await tuitions.insertOne(body);
   res.status(200).send({message : "you created a tuition successfully", result})
})

app.get("/tuitions", async (req, res)=>{
   const cursor =  tuitions.find()
   const result = await cursor.toArray();
   res.status(201).send(result)
})

app.get("/six-tuitions", async(req , res)=>{
     const result = await tuitions.find({
        isActive : true 
     })
     .sort({createdAt:-1})
     .limit(6).toArray();
     res.send(result)
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

app.patch("/tuition/:id", verifyToken ,async (req, res)=>{
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

app.post("/create-application", verifyToken ,async (req, res)=>{
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

// cancling an aplication 

app.delete("/canlcle-application/:applicationId", async(req , res )=>{
      const { applicationId } = req.params;
    //   const isApplicationPeding = await applications.find({
    //     status : "pending"
    //   });
    //   if(!isApplicationPeding){
    //     return res.status(409).send({ message : "Application accepted , so you cannot canlce"})
    //   } 
      
      const query = { _id : new ObjectId(applicationId) }

      const deleteResult = await applications.deleteOne(
          {
            ...query,
            status : "pending"
          }
      )

      res.status(201).send(deleteResult)
})

// applications-for-current-user's tuition 

app.get("/applicatios-of-current-user-tuition/:id", async( req, res )=>{
    const { id } = req.params;
    const query = { tuitorId : id };
    const cursor = applications.find(query);
    const result = await cursor.toArray();
    console.log(result);
    
    res.status(201).send(result)
})

// handling Accepted' or 'Rejected application 

app.patch("/updating-application-status/:id", async(req, res)=>{
    const { id } = req.params;
    const query = { _id : new ObjectId(id)}
    const update = req.body;
    const result = await applications.updateOne(
        query,
        { $set : update }
    )
    res.send(result)
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
    payment_status,
    amount_total
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
        amount_total : amount_total / 100,
        userId : metadata.userId,
        userName : metadata.userName,
        userRole : metadata.userRole,
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
 
app.get("/get-payments", async (req , res)=>{
     const cursor = payments.find({});
     const result = await cursor.toArray();
     res.send(result)
})


    // overveiw routes endpoint ------------------------------------
     
    // for student
    app.get("/studnet-overvew/:userId", async (req, res)=>{
        
        const { userId } = req.params
        //   Total applications submitted by the current student.

        const TotalApplicationsSubmittedByTheCurrentStudent = await applications.countDocuments(
            { studentId : userId }
        );
        const acceptedApplication = await applications.countDocuments({ 
            status :  "approved" || "accepted",
            studentId : userId
        });
        const pendingApplications = await applications.countDocuments({
            status : "pending",
            studentId : userId
        })
        
        const isUserPro = await payments.findOne({
            userId : userId
        })

         res.send({ 
            "totalTuitions" : TotalApplicationsSubmittedByTheCurrentStudent, 
            "acceptedApplication" : acceptedApplication ,
            "pendingApplications" : pendingApplications,
            "currentPlan"  : isUserPro ? "Pro" : "Free",
        })
    })

// for tutor 
// approved rejected

app.get("/tutor-overvew/:userId" , async (req, res)=>{
    const { userId } = req.params 
    const TotalTuitionCreatedByTheCurrentTutor = await tuitions.countDocuments({
         tutorId : userId
    });
        
        const approvedTuitions = await tuitions.countDocuments({
           approvalStatus : "approved",
           tutorId : userId
        })

        const totalApplicantsReceived = await tuitions.countDocuments({
            tutorId : userId
        });

         const isUserPro = await payments.findOne({
            userId : userId
        })


        res.send({
             "totalTuitions" : TotalTuitionCreatedByTheCurrentTutor ,
             "TotalApprovedTuitions" : approvedTuitions,
              "TotalApplicantsReceived" :totalApplicantsReceived,
              "currentPlan" : isUserPro ? "Pro": "Free"
            })
})

// for admin 
// (Total Users, Total Tutors, Pending vs. Approved Tuitions, Total Stripe Revenue)

app.get("/admin-overview", async (req , res)=>{
       const totalUsers = await users.countDocuments({})
       const totalTutor = await users.countDocuments({
         role : "tutor"
       });
       const pendingTuitions = await tuitions.countDocuments({
          approvalStatus : "pending"
       });
       const approvedTuitions = await tuitions.countDocuments({
          approvalStatus : "approved"
       });

        const pendingVsApprov = `Panding ${pendingTuitions} and Approved ${approvedTuitions}`

        const totalStripeRevenue = await payments.find({}).project({ amount_total : 1 , _id : 0 }).toArray()
     
        const totalRev = totalStripeRevenue.reduce((pre, item)=>{
           return pre+Number(item.amount_total || 0)
       },0)
        res.send({
             totalRev,
            "totalUsers" : totalUsers,
            "totalTutor" : totalTutor,
            "pendingTuitionsVsApprovedTuitions" : pendingVsApprov,
        });
}) 

app.listen(port, ()=>{
    console.log(`thie server is running on port ${port}`);
    
})

export default app;