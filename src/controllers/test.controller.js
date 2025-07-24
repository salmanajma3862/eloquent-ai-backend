import Session from '../models/sessionModel.js';

// IELTS Part 2 Speaking Topics Bank
const ieltsTopics = [
    "Describe a time you learned a new skill. You should say what the skill was, how you learned it, how long it took, and explain why you wanted to learn this skill.",
    
    "Talk about a book you have read recently. You should say what the book was about, why you chose to read it, what you learned from it, and explain whether you would recommend it to others.",
    
    "Describe a place you would like to visit in the future. You should say where this place is, why you want to visit it, what you would do there, and explain what makes this place special to you.",
    
    "Talk about a person who has influenced you. You should say who this person is, how you know them, what they have taught you, and explain why they have been important in your life.",
    
    "Describe a memorable meal you have had. You should say where you had this meal, who you were with, what you ate, and explain why this meal was special to you.",
    
    "Talk about a hobby or activity you enjoy. You should say what the activity is, when you started doing it, how often you do it, and explain why you find it enjoyable.",
    
    "Describe a difficult decision you had to make. You should say what the decision was about, what options you had, how you made the decision, and explain whether you think you made the right choice.",
    
    "Talk about a piece of technology that is important to you. You should say what it is, how you use it, how long you have had it, and explain why it is important in your life.",
    
    "Describe a festival or celebration in your country. You should say what the festival is, when it takes place, how people celebrate it, and explain why this festival is important to your culture.",
    
    "Talk about a goal you have achieved. You should say what the goal was, how long it took to achieve, what challenges you faced, and explain how you felt when you accomplished it.",
    
    "Describe a piece of advice someone gave you. You should say who gave you the advice, what the advice was about, whether you followed it, and explain how this advice affected you.",
    
    "Talk about a time when you helped someone. You should say who you helped, what kind of help you provided, why they needed help, and explain how you felt about helping them.",
    
    "Describe a childhood memory that is important to you. You should say what happened, how old you were, who was involved, and explain why this memory is significant to you.",
    
    "Talk about a subject you studied that you found interesting. You should say what the subject was, where you studied it, what you learned, and explain why you found it fascinating.",
    
    "Describe a time when you had to wait for something. You should say what you were waiting for, how long you had to wait, how you felt while waiting, and explain whether the wait was worth it."
];

// @desc    Get a random IELTS topic
// @route   GET /api/test/topic
// @access  Private
const getTestTopic = async (req, res) => {
    try {
        // Select a random topic from the array
        const randomIndex = Math.floor(Math.random() * ieltsTopics.length);
        const selectedTopic = ieltsTopics[randomIndex];

        res.json({
            topic: selectedTopic,
            topicNumber: randomIndex + 1,
            totalTopics: ieltsTopics.length
        });
    } catch (error) {
        console.error('Get topic error:', error);
        res.status(500).json({ message: 'Error fetching topic' });
    }
};

// @desc    Create a new test session
// @route   POST /api/test/session
// @access  Private
const createTestSession = async (req, res) => {
    try {
        const { topicText, audioUrl, durationInSeconds, transcribedText } = req.body;

        // Validate required fields
        if (!topicText || !audioUrl || !durationInSeconds) {
            return res.status(400).json({ 
                message: 'Missing required fields: topicText, audioUrl, and durationInSeconds are required' 
            });
        }

        // Create new session
        const session = await Session.create({
            user: req.user._id,
            topicText,
            audioUrl,
            durationInSeconds,
            transcribedText: transcribedText || '',
            status: 'processing'
        });

        res.status(201).json({
            message: 'Test session created successfully',
            session: {
                _id: session._id,
                topicText: session.topicText,
                audioUrl: session.audioUrl,
                durationInSeconds: session.durationInSeconds,
                transcribedText: session.transcribedText,
                status: session.status,
                createdAt: session.createdAt
            }
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ message: 'Error creating test session' });
    }
};

export { getTestTopic, createTestSession };
