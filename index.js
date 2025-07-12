const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
stripe = require("stripe")(process.env.VITE_Payment_Gateway_SK);
const port = process.env.PORT || 5000;
// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cmxhw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let menuCollection;
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewsCollection = client.db("bistroDb").collection("reviews");
    const cartsCollection = client.db("bistroDb").collection("carts");
    const paymentCollection = client.db("bistroDb").collection("payment");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send(token);
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // user related API

    // tempary remove this option verifyToken, verifyAdmin,
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // for admin

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorize access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // tempary remove this option verifyToken, verifyAdmin,
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // tempary remove this option verifyToken, verifyAdmin,
    // app.patch("/users/admin/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       role: "admin",
    //     },
    //   };
    //   const result = await userCollection.updateOne(query, updatedDoc);
    //   res.send(result);
    // });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const { makeAdmin } = req.body;
      const query = { _id: new ObjectId(id) };
      let updateDoc;
      if (makeAdmin) {
        updateDoc = { $set: { role: "admin" } };
      } else {
        updateDoc = { $unset: { role: "" } };
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      //  email unique
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user is already used", insertOne: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    // tempary remove this option verifyToken, verifyAdmin,
    app.post("/menu", async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const menu = req.body;
      const id = req.params.id;
      const query = { _id: id };
      const updatedDoc = {
        $set: {
          name: menu.name,
          category: menu.category,
          price: menu.price,
          recipe: menu.recipe,
          image: menu.image,
        },
      };
      const result = await menuCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // tempary remove this option verifyToken, verifyAdmin,
    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });
    // review
    app.get("/review", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // carts collection
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email required" });
      const result = await cartsCollection.deleteMany({ email });
      res.send(result);
    });

    // payment install here
    // app.post("/create-payment-intent", async (req, res) => {
    //   const { price } = req.body;
    //   const amount = parseInt(price * 100);
    //   console.log(`${amount} dddddd`);
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount,
    //     currency: "usd",
    //     payment_method_types: ["card"],
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        console.log(`${price} fffff`);
        const amount = parseInt(price * 100);
        console.log(`${amount} dddddd`);
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        console.log("Amount received from frontend:", amount);
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        console.error("Stripe error:", err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // payment done API data
    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartsCollection.deleteMany(query);
      res.send(result, deleteResult);
    });

    // tempary remove this option verifyToken,
    // app.get("/paymentHistory/:email", async (req, res) => {
    //   const email = { email: req.params.email };
    //   if (req.params.email !== req.decoded.email) {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   const result = await paymentCollection.find(email).toArray();
    //   res.send(result);
    // });

    app.get("/paymentHistory/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const query = { email: email };
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch payment history", error });
      }
    });

    // stats or analytics

    app.get("/admin-stats", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({
        users,
        menuItems,
        orders,
        revenue,
      });
    });

    // Send a ping to confirm a successful connection
    // await client.db("bistroDb").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss is sitting");
});

app.listen(port, () => {
  console.log(`Bistro boss is on port ${port}`);
});
