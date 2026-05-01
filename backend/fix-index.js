const mongoose = require("mongoose");
require("dotenv").config();

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const db = mongoose.connection.db;
    const collection = db.collection("batchestimations");
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes);
    
    // Drop the problematic index
    try {
      await collection.dropIndex("estimations.deliveryDetails.trackingId_1");
      console.log("✓ Index dropped successfully");
    } catch (err) {
      console.log("Index might not exist:", err.message);
    }
    
    // Drop the entire collection and recreate (alternative)
    // await collection.drop();
    // console.log("Collection dropped, will be recreated on next save");
    
    console.log("Fix completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixIndex();