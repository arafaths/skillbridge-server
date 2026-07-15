import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const { MongoClient, ServerApiVersion } = require('mongodb');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db('skillbridge');
    const usersCollection = database.collection('users');
    const projectsCollection = database.collection('projects');

    // Explore Projects
    app.get('/projects', async (req: Request, res: Response) => {
      try {
        const {
          search = '',
          category,
          minBudget,
          maxBudget,
          sort = 'newest',
          page = '1',
          limit = '8',
        } = req.query;

        const query: any = {};

        // Search
        if (search) {
          query.title = {
            $regex: search as string,
            $options: 'i',
          };
        }

        // Category
        if (category && category !== 'All Categories') {
          query.category = category;
        }

        // Budget
        if (minBudget || maxBudget) {
          query.budget = {};

          if (minBudget) {
            query.budget.$gte = Number(minBudget);
          }

          if (maxBudget) {
            query.budget.$lte = Number(maxBudget);
          }
        }

        // Sort
        let sortOption = {};

        switch (sort) {
          case 'lowBudget':
            sortOption = { budget: 1 };
            break;

          case 'highBudget':
            sortOption = { budget: -1 };
            break;

          case 'oldest':
            sortOption = { createdAt: 1 };
            break;

          default:
            sortOption = { createdAt: -1 };
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        const skip = (pageNumber - 1) * limitNumber;

        const total = await projectsCollection.countDocuments(query);

        const projects = await projectsCollection
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limitNumber)
          .toArray();

        res.status(200).json({
          success: true,
          total,
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          data: projects,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: 'Failed to fetch projects',
        });
      }
    });

    // Featured Projects API
    app.get('/projects/featured', async (req, res) => {
      try {
        const featuredProjects = await projectsCollection
          .find({
            featured: true,
            status: 'open',
          })
          .sort({ createdAt: -1 })
          .limit(4)
          .toArray();

        res.send({
          success: true,
          data: featuredProjects,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: 'Failed to fetch featured projects',
        });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 });
    console
      .log
      // 'Pinged your deployment. You successfully connected to MongoDB!',
      ();
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('SkillBridge Server is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
