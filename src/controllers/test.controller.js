import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import { createClient } from '@deepgram/sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

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
    
    "Describe a time when you had to wait for something. You should say what you were waiting for, how long you had to wait, how you felt while waiting, and explain whether the wait was worth it.",

    // Additional IELTS Part 2 Speaking Topics (200 more)
    "Talk about a teacher who made a difference in your life. You should say who this teacher was, what subject they taught, how they helped you, and explain why they were special.",

    "Describe a time when you received good news. You should say what the news was, how you received it, who you shared it with, and explain how you felt when you heard it.",

    "Talk about a movie that you enjoyed watching. You should say what the movie was about, when you watched it, who you watched it with, and explain why you enjoyed it.",

    "Describe a gift you gave to someone. You should say what the gift was, who you gave it to, why you chose this gift, and explain how the person reacted.",

    "Talk about a time when you were late for something important. You should say what you were late for, why you were late, what happened as a result, and explain how you felt about it.",

    "Describe a sport you would like to try. You should say what the sport is, where you could learn it, what equipment you would need, and explain why you want to try it.",

    "Talk about a photograph that is important to you. You should say what the photograph shows, when it was taken, why it is important to you, and explain what memories it brings back.",

    "Describe a time when you lost something important. You should say what you lost, when and where you lost it, how you tried to find it, and explain how you felt about losing it.",

    "Talk about a family tradition. You should say what the tradition is, how long your family has been doing it, when you do it, and explain why this tradition is important to your family.",

    "Describe a time when you tried something new. You should say what you tried, when you tried it, why you decided to try it, and explain how you felt about the experience.",

    "Talk about a song that has special meaning to you. You should say what the song is, when you first heard it, why it is special to you, and explain how it makes you feel.",

    "Describe a time when you had to work as part of a team. You should say what the project was, who was in your team, what your role was, and explain how well the team worked together.",

    "Talk about a building you admire. You should say what building it is, where it is located, what it looks like, and explain why you admire it.",

    "Describe a skill you would like to learn. You should say what the skill is, why you want to learn it, how you plan to learn it, and explain how this skill would benefit you.",

    "Talk about a time when you had to speak in public. You should say what the occasion was, who your audience was, what you spoke about, and explain how you felt about speaking in public.",

    "Describe a piece of clothing you like wearing. You should say what it is, when you bought it, how often you wear it, and explain why you like wearing it.",

    "Talk about a time when you felt proud of yourself. You should say what you did, when it happened, why you felt proud, and explain how this achievement affected you.",

    "Describe a game you enjoyed playing as a child. You should say what the game was, how you played it, who you played it with, and explain why you enjoyed it.",

    "Talk about a time when you had to make a complaint. You should say what you complained about, who you complained to, what the outcome was, and explain how you felt about making the complaint.",

    "Describe a historical period you find interesting. You should say what period it is, what you know about it, why you find it interesting, and explain what you would like to learn more about.",

    "Talk about a time when you changed your mind about something. You should say what you changed your mind about, what made you change it, how you felt about changing your mind, and explain whether you think you made the right decision.",

    "Describe a wild animal you find interesting. You should say what animal it is, where it lives, what it looks like, and explain why you find it interesting.",

    "Talk about a time when you had to use your imagination. You should say what the situation was, why you needed to use your imagination, what you imagined, and explain how it helped you.",

    "Describe a subject you studied that you found difficult. You should say what the subject was, why you found it difficult, how you tried to improve, and explain whether you eventually understood it better.",

    "Talk about a time when you visited a museum or art gallery. You should say which museum or gallery you visited, what you saw there, who you went with, and explain what you thought of the experience.",

    "Describe a time when you had to be patient. You should say what the situation was, why you had to be patient, how long you had to wait, and explain how you felt about being patient.",

    "Talk about a piece of furniture in your home. You should say what it is, where it is located, how long you have had it, and explain why it is important to you.",

    "Describe a time when you felt nervous. You should say what the situation was, why you felt nervous, how you dealt with your nerves, and explain what the outcome was.",

    "Talk about a local business that you know well. You should say what the business is, where it is located, how often you go there, and explain why you like this business.",

    "Describe a time when you had to work under pressure. You should say what the situation was, why there was pressure, how you handled it, and explain what you learned from the experience.",

    "Talk about a vehicle you would like to own. You should say what vehicle it is, why you would like to own it, how you would use it, and explain what you like about this vehicle.",

    "Describe a time when you helped organize an event. You should say what the event was, what your role was, who else was involved, and explain how you felt about organizing it.",

    "Talk about a place where you go to relax. You should say where this place is, how often you go there, what you do there, and explain why this place helps you relax.",

    "Describe a time when you had to learn something quickly. You should say what you had to learn, why you needed to learn it quickly, how you went about learning it, and explain whether you were successful.",

    "Talk about a person you know who has an interesting job. You should say who this person is, what their job involves, how you know about their job, and explain why you think their job is interesting.",

    "Describe a time when you received unexpected help. You should say who helped you, what kind of help you received, why it was unexpected, and explain how you felt about receiving this help.",

    "Talk about a plant or flower you like. You should say what it is, where you have seen it, what it looks like, and explain why you like it.",

    "Describe a time when you had to give a presentation. You should say what the presentation was about, who your audience was, how you prepared for it, and explain how you felt about giving it.",

    "Talk about a piece of equipment that is important in your home. You should say what it is, how often you use it, what you use it for, and explain why it is important to you.",

    "Describe a time when you felt disappointed. You should say what happened, why you felt disappointed, how you dealt with the disappointment, and explain what you learned from the experience.",

    "Talk about a foreign country you would like to work in. You should say which country it is, what kind of work you would like to do there, why you chose this country, and explain what you think working there would be like.",

    "Describe a time when you had to apologize to someone. You should say who you apologized to, what you had done wrong, how you apologized, and explain how the person reacted.",

    "Talk about a course you would like to take. You should say what the course is about, where you could take it, how long it would take, and explain why you want to take this course.",

    "Describe a time when you felt excited about something. You should say what you were excited about, why you felt excited, who you shared your excitement with, and explain how long the feeling lasted.",

    "Talk about a tool that is useful in your daily life. You should say what the tool is, how you use it, when you use it, and explain why it is useful to you.",

    "Describe a time when you had to comfort someone. You should say who you comforted, why they needed comforting, how you comforted them, and explain how you felt about helping them.",

    "Talk about a street market you have visited. You should say where the market was, what was sold there, what you bought, and explain what you thought of the market.",

    "Describe a time when you had to follow instructions carefully. You should say what the instructions were for, why you had to follow them carefully, whether you found them easy to follow, and explain what happened as a result.",

    "Talk about a piece of art you like. You should say what it is, where you have seen it, what it depicts, and explain why you like it.",

    "Describe a time when you had to make a quick decision. You should say what the decision was about, why you had to decide quickly, what you decided, and explain whether you think you made the right choice.",

    "Talk about a language you would like to learn. You should say what language it is, why you want to learn it, how you plan to learn it, and explain how learning this language would benefit you.",

    "Describe a time when you felt grateful. You should say what happened, why you felt grateful, who or what you were grateful for, and explain how this feeling affected you.",

    "Talk about a form of exercise you enjoy. You should say what the exercise is, when you do it, where you do it, and explain why you enjoy this form of exercise.",

    "Describe a time when you had to deal with a difficult situation. You should say what the situation was, why it was difficult, how you handled it, and explain what you learned from it.",

    "Talk about a shop you like to visit. You should say what kind of shop it is, where it is located, what you usually buy there, and explain why you like shopping there.",

    "Describe a time when you felt confused about something. You should say what confused you, why you were confused, how you tried to understand it, and explain whether you eventually figured it out.",

    "Talk about a natural place you enjoy visiting. You should say where this place is, what you can see and do there, how often you visit it, and explain why you enjoy going there.",

    "Describe a time when you had to be creative. You should say what the situation was, why you needed to be creative, what you created or came up with, and explain how you felt about being creative.",

    "Talk about a childhood friend you remember well. You should say who this friend was, how you met them, what you used to do together, and explain why you remember them so well.",

    "Describe a time when you felt homesick. You should say when this happened, where you were, why you felt homesick, and explain how you dealt with these feelings.",

    "Talk about a machine that is important in your life. You should say what the machine is, how you use it, how often you use it, and explain why it is important to you.",

    "Describe a time when you had to concentrate hard on something. You should say what you were concentrating on, why you needed to concentrate, how long you had to concentrate, and explain whether you were successful.",

    "Talk about a special occasion you celebrated recently. You should say what the occasion was, how you celebrated it, who you celebrated with, and explain why it was special to you.",

    "Describe a time when you felt surprised. You should say what surprised you, when it happened, why you were surprised, and explain how you reacted to the surprise.",

    "Talk about a type of weather you enjoy. You should say what type of weather it is, when you usually experience it, what you like to do in this weather, and explain why you enjoy it.",

    "Describe a time when you had to save money for something. You should say what you were saving for, how long it took to save the money, how you managed to save it, and explain how you felt when you finally bought it.",

    "Talk about a person you know who is good at their job. You should say who this person is, what their job is, what makes them good at it, and explain how you know they are good at their job.",

    "Describe a time when you felt stressed. You should say what caused the stress, how you felt, what you did to manage the stress, and explain what you learned from the experience.",

    "Talk about a type of food you have never tried but would like to. You should say what food it is, where it comes from, why you want to try it, and explain what you think it might taste like.",

    "Describe a time when you had to work with someone you didn't know well. You should say who the person was, what you had to work on together, how you got along, and explain what you learned from working with them.",

    "Talk about a piece of news that interested you recently. You should say what the news was about, where you heard or read it, why it interested you, and explain how you felt about this news.",

    "Describe a time when you felt proud of someone else. You should say who you felt proud of, what they did, why you felt proud of them, and explain how you showed your pride.",

    "Talk about a method of transport you often use. You should say what method of transport it is, when you use it, why you choose this method, and explain what you like or dislike about it.",

    "Describe a time when you had to ask for help. You should say what you needed help with, who you asked for help, why you needed help, and explain how you felt about asking for help.",

    "Talk about a room in your home that you spend a lot of time in. You should say which room it is, what you do in this room, how it is decorated, and explain why you spend so much time there.",

    "Describe a time when you felt relieved. You should say what you were worried about, why you were worried, what happened to make you feel relieved, and explain how strong this feeling was.",

    "Talk about a competition you would like to take part in. You should say what the competition is, what it involves, why you want to participate, and explain what you think your chances of winning would be.",

    "Describe a time when you had to be brave. You should say what the situation was, why you had to be brave, what you did, and explain how you felt about being brave.",

    "Talk about a habit you have that you think is good. You should say what the habit is, when you developed it, how it benefits you, and explain why you think it is a good habit.",

    "Describe a time when you felt embarrassed. You should say what happened, why you felt embarrassed, who was present, and explain how you dealt with the embarrassment.",

    "Talk about a type of music you enjoy listening to. You should say what type of music it is, when you listen to it, why you enjoy it, and explain how this music makes you feel.",

    "Describe a time when you had to explain something to someone. You should say what you had to explain, who you explained it to, why they needed the explanation, and explain whether you were successful in making them understand.",

    "Talk about a place where you studied or worked. You should say where this place was, what you studied or worked on there, how long you spent there, and explain what you remember most about this place.",

    "Describe a time when you felt curious about something. You should say what you were curious about, why it interested you, what you did to satisfy your curiosity, and explain what you discovered.",

    "Talk about a tradition from another country that you find interesting. You should say what the tradition is, which country it comes from, how you learned about it, and explain why you find it interesting.",

    "Describe a time when you had to repair something. You should say what you had to repair, why it needed repairing, how you repaired it, and explain whether you were successful.",

    "Talk about a skill that took you a long time to learn. You should say what the skill was, how you learned it, why it took so long, and explain how you felt when you finally mastered it.",

    "Describe a time when you felt jealous. You should say what made you feel jealous, who or what you were jealous of, how you dealt with these feelings, and explain what you learned from the experience.",

    "Talk about a type of weather you dislike. You should say what type of weather it is, why you dislike it, how it affects your daily life, and explain what you do when this weather occurs.",

    "Describe a time when you had to make a sacrifice. You should say what you had to sacrifice, why you made this sacrifice, how you felt about it, and explain whether you think it was worth it.",

    "Talk about a person you know who has overcome a challenge. You should say who this person is, what challenge they faced, how they overcame it, and explain what you learned from their experience.",

    "Describe a time when you felt lucky. You should say what happened, why you felt lucky, how this luck affected you, and explain whether you believe in luck.",

    "Talk about a type of exercise you think everyone should do. You should say what the exercise is, why you think it's beneficial, how often people should do it, and explain why you recommend it to everyone.",

    "Describe a time when you had to adapt to a new situation. You should say what the new situation was, why you had to adapt, how you adapted, and explain how you felt about the change.",

    "Talk about a piece of technology that has changed your life. You should say what the technology is, when you started using it, how it has changed your life, and explain whether this change has been positive or negative.",

    "Describe a time when you felt misunderstood. You should say what happened, why you felt misunderstood, how you tried to clarify the situation, and explain how the situation was resolved.",

    "Talk about a type of food that is popular in your country. You should say what the food is, how it is prepared, when people usually eat it, and explain why it is popular.",

    "Describe a time when you had to keep a secret. You should say what the secret was, who asked you to keep it, why it was important to keep it secret, and explain how you felt about keeping it.",

    "Talk about a place where you feel safe and secure. You should say where this place is, why you feel safe there, how often you go there, and explain what makes this place special to you.",

    "Describe a time when you felt inspired by someone. You should say who inspired you, what they did that inspired you, how their actions affected you, and explain what you learned from them.",

    "Talk about a type of entertainment you enjoyed as a child. You should say what it was, when you used to enjoy it, who you enjoyed it with, and explain why you liked it so much.",

    "Describe a time when you had to overcome a fear. You should say what you were afraid of, why you were afraid, how you overcame your fear, and explain how you felt after overcoming it.",

    "Talk about a piece of advice you would give to someone younger than you. You should say what the advice is, why you think it's important, when you learned this lesson, and explain how following this advice could help them.",

    "Describe a time when you felt overwhelmed. You should say what caused you to feel overwhelmed, how you dealt with these feelings, who helped you, and explain what you learned from the experience.",

    "Talk about a type of art or craft you would like to learn. You should say what it is, why you want to learn it, how you plan to learn it, and explain what you hope to create.",

    "Describe a person you know who is very organized. You should say who this person is, how you know they are organized, what methods they use to stay organized, and explain what you can learn from them.",

    "Talk about a time when you felt determined to achieve something. You should say what you wanted to achieve, why it was important to you, what obstacles you faced, and explain whether you were successful.",

    "Describe a type of transportation you have never used but would like to try. You should say what it is, where you could use it, why you want to try it, and explain what you think the experience would be like.",

    "Talk about a time when you had to work overtime or stay late. You should say what you were working on, why you had to stay late, how you felt about it, and explain what you accomplished.",

    "Describe a person you know who has a good sense of humor. You should say who this person is, what makes them funny, how their humor affects others, and explain why you enjoy their company.",

    "Talk about a time when you felt confident about something. You should say what you felt confident about, why you felt this way, how this confidence helped you, and explain what the outcome was.",

    "Describe a type of book you enjoy reading. You should say what genre it is, why you enjoy this type of book, how often you read them, and explain what you get from reading these books.",

    "Talk about a time when you had to deal with a language barrier. You should say what the situation was, what language difficulties you faced, how you overcame them, and explain what you learned from the experience.",

    "Describe a person you know who is very punctual. You should say who this person is, how you know they are always on time, why you think punctuality is important to them, and explain how their punctuality affects others.",

    "Talk about a time when you felt nostalgic. You should say what triggered this feeling, what you were nostalgic about, how long the feeling lasted, and explain why certain memories make you feel this way.",

    "Describe a type of volunteer work you would like to do. You should say what kind of volunteer work it is, why you want to do it, how you could get involved, and explain what you think you would gain from the experience.",

    "Talk about a time when you had to multitask. You should say what tasks you had to do simultaneously, why you had to multitask, how you managed it, and explain whether you were successful.",

    "Describe a person you know who is very generous. You should say who this person is, how they show their generosity, why you think they are generous, and explain how their generosity affects others.",

    "Talk about a time when you felt motivated to change something about yourself. You should say what you wanted to change, what motivated you, what steps you took, and explain whether you were successful in making the change.",

    "Describe a type of celebration that is important in your culture. You should say what the celebration is, when it takes place, how people celebrate it, and explain why it is significant in your culture.",

    "Talk about a time when you had to be diplomatic. You should say what the situation was, why diplomacy was needed, how you handled it, and explain what the outcome was.",

    "Describe a person you know who has achieved something impressive. You should say who this person is, what they achieved, how they achieved it, and explain why you find their achievement impressive.",

    "Talk about a time when you felt optimistic about the future. You should say what made you feel optimistic, what you were looking forward to, how long this feeling lasted, and explain why optimism is important.",

    "Describe a type of music that is popular in your country. You should say what type of music it is, who typically listens to it, why it is popular, and explain whether you enjoy this type of music.",

    "Talk about a time when you had to be resourceful. You should say what the situation was, why you needed to be resourceful, what you did, and explain how your resourcefulness helped solve the problem.",

    "Describe a person you know who is very reliable. You should say who this person is, how they demonstrate their reliability, why reliability is important, and explain how their reliability has affected your relationship with them.",

    "Talk about a time when you felt accomplished. You should say what you accomplished, how long it took, what challenges you faced, and explain why this accomplishment was meaningful to you.",

    "Describe a type of outdoor activity you enjoy. You should say what the activity is, where you do it, who you do it with, and explain why you enjoy spending time outdoors doing this activity.",

    "Talk about a time when you had to show leadership. You should say what the situation was, why leadership was needed, what you did as a leader, and explain what you learned about leadership from this experience.",

    "Describe a person you know who is very creative. You should say who this person is, how they express their creativity, what creative things they have done, and explain what you admire about their creativity.",

    "Talk about a time when you felt peaceful. You should say where you were, what you were doing, why you felt peaceful, and explain what peace means to you.",

    "Describe a type of job that you think is important for society. You should say what the job is, what people in this job do, why it is important, and explain whether you would consider doing this job yourself.",

    "Talk about a time when you had to be flexible with your plans. You should say what your original plans were, why you had to change them, how you adapted, and explain how you felt about being flexible.",

    "Describe a person you know who has good communication skills. You should say who this person is, what makes them a good communicator, how their communication skills help them, and explain what you can learn from them.",

    "Talk about a time when you felt energetic and full of life. You should say what you were doing, what made you feel this way, how long the feeling lasted, and explain what gives you energy in life.",

    "Describe a website you find useful. You should say what the website is, how often you use it, what you use it for, and explain why you find it useful.",

    "Talk about a time when you had to use public transportation. You should say where you were going, what type of transport you used, how the journey was, and explain how you felt about using public transport.",

    "Describe a person you admire from history. You should say who this person is, what they are famous for, why you admire them, and explain what you can learn from their life.",

    "Talk about a time when you had to wait in a long queue. You should say what you were waiting for, how long you had to wait, how you passed the time, and explain how you felt about waiting.",

    "Describe a skill you learned from a family member. You should say what the skill is, which family member taught you, how they taught you, and explain why this skill is useful to you.",

    "Talk about a time when you felt homesick. You should say when this happened, where you were, what made you feel homesick, and explain how you dealt with these feelings.",

    "Describe a place you went to that was very crowded. You should say where you went, why it was crowded, how you felt about the crowds, and explain whether you enjoyed the experience despite the crowds.",

    "Talk about a time when you had to give up something you wanted. You should say what you had to give up, why you had to give it up, how you felt about it, and explain whether you think you made the right decision.",

    "Describe a person you know who works very hard. You should say who this person is, what kind of work they do, why they work so hard, and explain what you can learn from their work ethic.",

    "Talk about a time when you received a compliment. You should say what the compliment was about, who gave it to you, why they complimented you, and explain how it made you feel.",

    "Describe a place you have been to that has beautiful scenery. You should say where this place is, what the scenery looks like, when you visited it, and explain why you found it beautiful.",

    "Talk about a time when you had to make a phone call in English. You should say who you called, why you had to call them, how the conversation went, and explain how you felt about speaking English on the phone.",

    "Describe a person you know who is always positive. You should say who this person is, how they show their positivity, why you think they are always positive, and explain how their attitude affects others.",

    "Talk about a time when you lost your way. You should say where you were trying to go, how you got lost, how you found your way, and explain how you felt about being lost.",

    "Describe a festival you would like to attend. You should say what festival it is, where it takes place, what happens at the festival, and explain why you want to attend it."
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

// @desc    Transcribe prerecorded audio file and create session (CEO's new strategy)
// @route   POST /api/test/transcribe
// @access  Private
const transcribePrerecorded = async (req, res) => {
  try {
    const { topicText, durationInSeconds } = req.body;
    if (!req.file || !topicText || !durationInSeconds) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const user = await User.findById(req.user._id);
    const now = new Date();

    // --- NEW "CREDIT SYSTEM" GATING LOGIC ---

    // 1. Handle expired subscriptions first
    if (user.subscription.plan !== 'free' && user.subscription.validUntil < now) {
        user.subscription.plan = 'free';
        user.sessionsRemaining = 3; // Give them 3 new free credits
        user.sessionsTaken = 0; // Reset their paid session count
        await user.save();
        return res.status(403).json({ message: "Your premium plan has expired." });
    }

    // 2. Check if the user has any sessions remaining.
    if (user.sessionsRemaining <= 0) {
        // This now correctly blocks both free users and premium users who have hit their limit.
        return res.status(403).json({ message: "You have no sessions remaining. Please upgrade or wait for your plan to renew." });
    }

    // --- END GATING LOGIC ---

    const duration = parseInt(req.body.durationInSeconds, 10);
    const userPlan = user.subscription.plan;

    // --- NEW TIERED DURATION VALIDATION ---
    const MAX_FREE_DURATION = 65; // 60 seconds + 5s grace period
    if (userPlan === 'free' && duration > MAX_FREE_DURATION) {
        return res.status(403).json({
            message: 'Free users are limited to 1-minute recordings. Please upgrade for the full 2-minute experience.'
        });
    }
    // ------------------------------------

    // --- NEW: R2 UPLOAD LOGIC ---
    // 1. Generate a unique key for the file
    const fileKey = `audio-recordings/${crypto.randomUUID()}.webm`;

    // 2. Create the command to upload the file buffer
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer, // The audio file from multer
      ContentType: req.file.mimetype,
    });

    // 3. Execute the upload
    await s3Client.send(uploadCommand);

    // 4. Construct the public URL
    const audioUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;
    // ----------------------------

    // Transcribe the audio (existing logic is fine)
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      req.file.buffer,
      {
        model: 'nova-2',
        smart_format: true,
      }
    );
    if (error) throw error;
    const transcript = result.results.channels[0].alternatives[0].transcript;

    // --- MODIFIED: Session Saving Logic ---
    // Create the new session with the REAL audioUrl
    const newSession = new Session({
      user: req.user._id,
      topicText,
      durationInSeconds,
      transcribedText: transcript,
      audioUrl: audioUrl, // Use the real URL, not the placeholder
    });
    await newSession.save();

    // --- NEW "CREDIT SYSTEM" UPDATE LOGIC ---
    // Decrement remaining sessions
    user.sessionsRemaining -= 1;
    // Increment taken sessions for the current period
    user.sessionsTaken += 1;
    // Increment lifetime total sessions for analytics
    user.totalSessions += 1;
    user.lastSessionDate = new Date();

    await user.save();
    // ------------------------------------

    // Return the ID of the new session so the frontend can redirect
    res.status(201).json({ sessionId: newSession._id });

  } catch (error) {
    console.error("Error in transcribePrerecorded:", error);
    res.status(500).json({ message: 'Error processing audio' });
  }
};

export { getTestTopic, createTestSession, transcribePrerecorded };
