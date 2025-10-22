// backend/index.js (Poora Code - Reverted to Simple CORS)
const express = require('express');
const cors = require('cors'); // Import cors
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Hamaare Models ---
const Project = require('./models/Project');
const File = require('./models/File');
const User = require('./models/User');

// --- Hamaara Guard (Middleware) ---
const auth = require('./middleware/auth');

const app = express();
const PORT = 5000;
const JWT_SECRET = "your-secret-key";

app.use(cors()); // <-- Simplified CORS: Allow all origins
app.use(express.json());

// --- MongoDB Connection ---
// !!! APNI CONNECTION STRING YAHAN PASTE KAREIN !!!
const MONGO_URI = "mongodb+srv://rashid276142:7052Lpu%40@cipherstudio-cluster.iikm2ah.mongodb.net/?retryWrites=true&w=majority&appName=cipherstudio-cluster"; // <-- Aapki URI daali hui hai
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));
// --------------------------

app.get('/', (req, res) => {
  res.send('Hello from CipherStudio Backend!');
});

// --- Authentication API Endpoints ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({ message: 'Login successful!', token: token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});


// --- User's Projects API Endpoints ---

/* API 1: Naya Project Save Karna (POST /api/projects) */
app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, files } = req.body;
    const userId = req.user.userId;

    const existingProject = await Project.findOne({ name, userId });
    if (existingProject) {
      return res.status(400).json({ message: 'Project with this name already exists' });
    }

    const newProject = new Project({ name: name, userId: userId });
    const savedProject = await newProject.save();

    const filePromises = Object.keys(files).map(fileName => {
      const newFile = new File({
        projectId: savedProject._id,
        name: fileName,
        type: 'file',
        content: files[fileName],
      });
      return newFile.save();
    });
    await Promise.all(filePromises);

    res.status(201).json({ message: 'Project saved successfully!', projectId: savedProject._id });
  } catch (error) {
    res.status(500).json({ message: 'Error saving project', error: error.message });
  }
});

/* API 2: User ke Saare Projects Load Karna (GET /api/projects) */
app.get('/api/projects', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await Project.find({ userId: userId }).select('name createdAt _id'); // Include _id
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
});

/* API 3: Ek Specific Project ki Files Load Karna (GET /api/projects/:id) */
app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: projectId, userId: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or user unauthorized' });
    }

    const files = await File.find({ projectId: project._id });
    const sandpackFiles = {};
    files.forEach(file => {
      if (file.name && typeof file.content === 'string') {
          sandpackFiles[file.name] = file.content;
      } else {
          console.warn(`Skipping file without name or content: ${file._id}`);
      }
    });

    res.status(200).json(sandpackFiles);
  } catch (error) {
    res.status(500).json({ message: 'Error loading project files', error: error.message });
  }
});

/* API 4: Ek Project ko Update (Overwrite) Karna (PUT /api/projects/:id) */
app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { files } = req.body;
    const userId = req.user.userId;

    const project = await Project.findOne({ _id: projectId, userId: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or user unauthorized' });
    }

    await File.deleteMany({ projectId: projectId });

    const filePromises = Object.keys(files).map(fileName => {
      const newFile = new File({
        projectId: projectId,
        name: fileName,
        type: 'file', // Assuming only files for now
        content: files[fileName],
      });
      return newFile.save();
    });
    await Promise.all(filePromises);

    res.status(200).json({ message: 'Project updated successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
});

/* API 5: Rename a File or Folder (PUT /api/files/:id) */
app.put('/api/files/:id', auth, async (req, res) => {
  try {
    const fileId = req.params.id;
    const { newName } = req.body;
    const userId = req.user.userId;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: 'New name cannot be empty' });
    }
     const trimmedNewName = newName.trim();

     if (!trimmedNewName.startsWith('/')) {
         return res.status(400).json({ message: 'File/Folder name must start with /' });
     }

    const fileToRename = await File.findById(fileId);
    if (!fileToRename) {
      return res.status(404).json({ message: 'File or folder not found' });
    }

    const project = await Project.findOne({ _id: fileToRename.projectId, userId: userId });
    if (!project) {
      return res.status(403).json({ message: 'User unauthorized to rename this file/folder' });
    }

    const existingFile = await File.findOne({
      projectId: fileToRename.projectId,
      name: trimmedNewName,
      _id: { $ne: fileId }
    });

    if (existingFile) {
      return res.status(400).json({ message: 'A file or folder with this name already exists in this project.' });
    }

    fileToRename.name = trimmedNewName;
    const updatedFile = await fileToRename.save();

    res.status(200).json({ message: 'Renamed successfully!', updatedFile: updatedFile });

  } catch (error) {
    if (error.code === 11000) {
         return res.status(400).json({ message: 'A file or folder with this name already exists.' });
    }
    console.error("Rename Error:", error);
    res.status(500).json({ message: 'Error renaming file/folder', error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});