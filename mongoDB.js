const { application } = require("express");
const jwt = require("jsonwebtoken");

const {
  MongoClient,
  ServerApiVersion,
  Collection,
  ObjectId,
} = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mcintht.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function verifyToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Token Unavailable" });
  }
  jwt.verify(token, process.env.CLIENT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).json({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
}

async function run(app) {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Database and Collections
    const twelfthDB = client.db("twelfthDB");
    const camps = twelfthDB.collection("camps")
    const users = twelfthDB.collection("users");
    const registered_users = twelfthDB.collection("registered_users")

    // verify email
    const verifyEmail = (req, res, next) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }
      next();
    };

    // admin verification
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await users.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // create jwt token
    app.post("/login", async (req, res) => {
      const body = req.body;
      const query = { email: body.email };
      const findUser = await users.findOne(query);
      if (!findUser) {
        const obj = { email: body.email, role: "participant" };
        const result = await users.insertOne(obj);
      }
      const token = jwt.sign(body, process.env.CLIENT_SECRET, {
        expiresIn: "1d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.send({ success: true });
    });

    // remove token
    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.send({ success: true });
    });

    // make admin
    // app.patch("/role/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       role: "admin",
    //     },
    //   };
    //   const result = await users.updateOne(query, updateDoc);
    //   res.send(result);
    // });

    // send admin true in for UI based render using an email
    // here you dont need to verify admin
    app.get("/check/:email", verifyToken, verifyEmail, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await users.findOne(query);
      let admin = false;
      if (user && user.role === "admin") {
        admin = true;
        // same as this condition
        // admin = user?.role === 'admin';
      }
      res.send({ admin });
    });

    // get all user (for admin)
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = users.find();
      const all_user = await result.toArray();
      res.send(all_user);
    });
    
    // delete user 
    app.delete("/delete/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await users.deleteOne(query);
      res.send(result);
    });

    // upload a camp 
    app.post("/upload-camp/",verifyToken,verifyAdmin,async(req,res)=>{
      const camp_data = req.body
      const result = await camps.insertOne(camp_data)
      res.send(result)
    })
    
    // get all camps 
    app.get("/camps",async(req,res)=>{
      const get_camps = camps.find()
      const all_camp = await get_camps.toArray()
      res.send(all_camp)
    })

    // get a camp 
    app.get("/camp/:id",async(req,res)=>{
      const id = req.params.id
      const query = {_id:new ObjectId(id)}
      const result = await camps.findOne(query)
      res.send(result)
    })

    // update camp info 
    app.patch("/update-camp/:campId",verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.campId
    })
    
    // delete camp 
    app.delete("/delete-camp/:campId",verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.campId
      const query = {_id : new ObjectId(id)}
      const result = await camps.deleteOne(query)
      res.send(result) 
    })

    // registered_users 
    app.post("/register-campaign",verifyToken,async(req,res)=>{
      const get_object = req.body
      const query = {campId:get_object.campId,email:get_object.email}
      const isRegistered = await registered_users.findOne(query)
      if(isRegistered){
        return res.send({acknowledged
          :false})
      }
      else{
        const insert_result = await registered_users.insertOne(get_object)
        const result = await camps.updateOne(
          { _id: new ObjectId(get_object.campId) },
          { $inc: { participants: 1 } }
        );
        res.send(insert_result)
      }
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

module.exports = { run };
