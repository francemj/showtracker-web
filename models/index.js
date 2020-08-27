const mongoose = require("mongoose");
//mongoose
mongoose.connect(
  "mongodb+srv://" +
    process.env.MONGOLOGIN +
    "@cluster0.ntq2u.mongodb.net/showDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// When successfully connected
mongoose.connection.on("connected", () => {
  console.log("Established Mongoose Default Connection");
});

// When connection throws an error
mongoose.connection.on("error", (err) => {
  console.log("Mongoose Default Connection Error : " + err);
});
