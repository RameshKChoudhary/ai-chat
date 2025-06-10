import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiMenu } from "react-icons/fi";
import Ram2 from "./assets/ram.webp";
import "./App.css";

function App() {
  const [userInput, setUserInput] = useState("");
  const [responses, setResponses] = useState([]); // Changed from single response to array of responses
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [isThrown, setIsThrown] = useState(false);
  const [history, setHistory] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  
  // Topic persistence state
  const [currentTopic, setCurrentTopic] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [topicChanged, setTopicChanged] = useState(false);
  
  // Add new state for topic history
  const [topicHistory, setTopicHistory] = useState([]);
  const [topicConversations, setTopicConversations] = useState({});

  // Reference to track if this is the first message
  const isFirstMessage = useRef(true);
  
  // Ref for response container to scroll to bottom on new messages
  const responseContainerRef = useRef(null);

  // Function to detect if a new topic has been introduced
  const isNewTopicIntroduced = (newInput, currentTopicText, conversationContext) => {
    // If this is the first message, it's definitely a new topic
    if (isFirstMessage.current) return true;
    
    // If there's no current topic, any message establishes a new topic
    if (!currentTopicText) return true;
    
    // Simple heuristics to detect topic changes
    
    // 1. Check if message starts with phrase indicating topic change
    const topicChangeIndicators = [
      "let's talk about", "can we discuss", "i want to ask about", 
      "tell me about", "what do you think about", "new topic:", 
      "switch to", "changing the subject", "moving on to"
    ];
    
    const lowerInput = newInput.toLowerCase();
    if (topicChangeIndicators.some(indicator => lowerInput.startsWith(indicator))) {
      return true;
    }
    
    // 2. Check if the message appears unrelated to current conversation
    // This is a simplified version - for production, consider using NLP/embeddings
    
    // Extract key words from current topic (naive approach)
    const currentTopicWords = new Set(
      currentTopicText.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 3) // Only consider words longer than 3 chars
    );
    
    // Extract recent conversation words
    let recentConversationWords = new Set();
    if (conversationContext.length > 0) {
      // Get last 2 exchanges for context
      const recentMessages = conversationContext.slice(-4);
      recentMessages.forEach(msg => {
        const words = msg.content.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(word => word.length > 3);
        words.forEach(word => recentConversationWords.add(word));
      });
    }
    
    // Extract new input words
    const newInputWords = new Set(
      lowerInput
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 3)
    );
    
    // Check overlap with current topic and recent conversation
    let topicOverlap = 0;
    let conversationOverlap = 0;
    let totalNewWords = 0;
    
    newInputWords.forEach(word => {
      totalNewWords++;
      if (currentTopicWords.has(word)) topicOverlap++;
      if (recentConversationWords.has(word)) conversationOverlap++;
    });
    
    // If almost no words overlap with current topic or recent conversation, likely a new topic
    const topicOverlapRatio = topicOverlap / totalNewWords;
    const conversationOverlapRatio = conversationOverlap / totalNewWords;
    
    // If the message is reasonably long and has little overlap, consider it a new topic
    if (totalNewWords >= 3 && topicOverlapRatio < 0.2 && conversationOverlapRatio < 0.2) {
      return true;
    }
    
    // 3. Significant length difference can indicate a topic shift
    // If new message is significantly longer than the current topic, it might be introducing a new topic
    if (newInput.length > currentTopicText.length * 2 && newInput.length > 50) {
      return true;
    }
    
    // Consider questions with no context as potential topic shifts
    if (lowerInput.includes("?") && totalNewWords >= 3 && topicOverlapRatio < 0.3) {
      return true;
    }
    
    return false;
  };

  // Scroll to bottom of messages when new content is added
  useEffect(() => {
    if (responseContainerRef.current) {
      responseContainerRef.current.scrollTop = responseContainerRef.current.scrollHeight;
    }
  }, [responses, conversationHistory]);

  const sendToGroq = async () => {
    if (!userInput) {
      alert("Please enter some text!");
      return;
    }

    setIsLoading(true);
    setShowResponse(true);
    setIsThrown(true);
    
    // Store query in history
    setHistory((prevHistory) => [userInput, ...prevHistory]);
    
    // Check if this is a new topic
    const newTopicDetected = isNewTopicIntroduced(userInput, currentTopic, conversationHistory);
    const previousTopic = currentTopic;
    
    // If this is a new topic, update current topic
    if (newTopicDetected) {
      // If there was a previous topic, save its conversation
      if (previousTopic && conversationHistory.length > 0) {
        // Save current conversation to the topic conversations
        setTopicConversations(prev => ({
          ...prev,
          [previousTopic]: {
            conversation: [...conversationHistory],
            responses: [...responses] // Save the accumulated responses for this topic
          }
        }));
        
        // Add previous topic to topic history if not already there
        if (!topicHistory.includes(previousTopic)) {
          setTopicHistory(prev => [previousTopic, ...prev]);
        }
      }
      
      // Set the new topic
      setCurrentTopic(userInput);
      setTopicChanged(previousTopic !== "");
      isFirstMessage.current = false;
      
      // Start a new conversation for this topic
      setConversationHistory([]);
      // Don't clear responses here - we want to accumulate them until New Topic is clicked
    }
    
    // Add user message to conversation history
    const updatedConversation = [
      ...conversationHistory, 
      { role: "user", content: userInput }
    ];
    setConversationHistory(updatedConversation);
    
    // Clear input immediately after sending
    setUserInput("");

    // Reset arrow animation
    setTimeout(() => setIsThrown(false), 1000);

    try {
      const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      const apiKey = "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";

      if (!apiKey) {
        throw new Error("API key not configured. Please set REACT_APP_GROQ_API_KEY in your environment.");
      }

      const languageInstruction = selectedLanguage === "english" 
        ? "Respond in English." 
        : selectedLanguage === "hindi" 
        ? "Respond in Hindi." 
        : "Respond in Marathi.";
      
      // Enhanced system instruction with topic awareness
      const systemInstruction = `You are a helpful AI assistant that provides accurate and concise information. ${languageInstruction}
      ${newTopicDetected ? `The user has started a new topic: "${userInput}". Please respond directly to this new topic.` : 
      `The current topic is: "${currentTopic}". Continue providing information within this context.`}
      ${conversationHistory.length > 2 ? "This is a continuation of a conversation. Build upon previous responses." : ""}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: systemInstruction },
            // Include up to 5 previous messages for context, if they exist
            ...updatedConversation.slice(-5),
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Add AI response to conversation history
      const newConversationHistory = [...updatedConversation, { role: "assistant", content: aiResponse }];
      setConversationHistory(newConversationHistory);
      
      // Format the response display and ADD to existing responses instead of replacing
      const newResponse = `You: ${userInput}\n\nAI: ${aiResponse}`;
      setResponses(prevResponses => [...prevResponses, newResponse]);

      // Reset topic change flag
      setTopicChanged(false);
    } catch (error) {
      console.error("Error calling Groq API:", error);
      // Add error to responses rather than replacing
      setResponses(prevResponses => [...prevResponses, `Error: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendToGroq();
    }
  };

  const changeLanguage = (language) => {
    setSelectedLanguage(language);
  };

  const startNewTopic = () => {
    // Save current topic conversation before resetting
    if (currentTopic && conversationHistory.length > 0) {
      setTopicConversations(prev => ({
        ...prev,
        [currentTopic]: {
          conversation: [...conversationHistory],
          responses: [...responses] // Save accumulated responses
        }
      }));
      
      // Add current topic to topic history if not already there
      if (!topicHistory.includes(currentTopic)) {
        setTopicHistory(prev => [currentTopic, ...prev]);
      }
    }
    
    // Reset conversation for a new topic
    setCurrentTopic("");
    isFirstMessage.current = true;
    setConversationHistory([]);
    // Now clear responses when explicitly starting a new topic
    setResponses([]);
    setShowResponse(false);
  };
  
  const switchToTopic = (topic) => {
    // Save current topic conversation before switching
    if (currentTopic && conversationHistory.length > 0) {
      setTopicConversations(prev => ({
        ...prev,
        [currentTopic]: {
          conversation: [...conversationHistory],
          responses: [...responses] // Save accumulated responses
        }
      }));
      
      // Add current topic to topic history if not already there
      if (!topicHistory.includes(currentTopic)) {
        setTopicHistory(prev => [currentTopic, ...prev]);
      }
    }
    
    // Switch to selected topic
    setCurrentTopic(topic);
    
    // Restore conversation history
    setConversationHistory(topicConversations[topic]?.conversation || []);
    
    // Restore accumulated responses for this topic
    if (topicConversations[topic]?.responses && topicConversations[topic].responses.length > 0) {
      setResponses(topicConversations[topic].responses);
      setShowResponse(true);
    } else if (topicConversations[topic]?.conversation && topicConversations[topic].conversation.length > 0) {
      // If we have no saved responses but have conversation history, rebuild the responses
      const reconstructedResponses = [];
      const conversation = topicConversations[topic].conversation;
      
      // Group user and assistant messages to reconstruct the response format
      for (let i = 0; i < conversation.length; i += 2) {
        if (i + 1 < conversation.length) {
          const userMsg = conversation[i].content;
          const aiMsg = conversation[i + 1].content;
          reconstructedResponses.push(`You: ${userMsg}\n\nAI: ${aiMsg}`);
        }
      }
      
      setResponses(reconstructedResponses);
      setShowResponse(true);
    } else {
      setResponses([]);
      setShowResponse(false);
    }
    
    // Close menu after selection on mobile
    setIsMenuOpen(false);
  };

  // Function to truncate text for display
  const truncateText = (text, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="bodydiv"
      style={{
        backgroundImage: `url(${Ram2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        display: "flex",
        width: "100%",
        height: "100%",
      }}
    >
      <div className="hamburger-menu">
        <FiMenu className="menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)} />
        {isMenuOpen && (
          <div className="sidebar">
            <h2>Search History</h2>
            <br/>
            {currentTopic && (
              <div className="current-topic-info">
                <h3>Current Topic:</h3>
                <p className="topic-text">{currentTopic}</p>
                <br/>
                <button onClick={startNewTopic} className="new-topic-btn">Start New Topic</button>
              </div>
            )}
            
            <br />
            <div className="current-topic-info_br"></div>
            <br/>
            
            {topicHistory.length > 0 && (
              <div className="topic-history-section">
                <h2>Previous Topics</h2>
                <ul className="topic-list">
                  {topicHistory.map((topic, index) => (
                    <li 
                      key={`topic-${index}`} 
                      className={`topic-item ${currentTopic === topic ? 'active-topic' : ''}`}
                      onClick={() => switchToTopic(topic)}
                    >
                      <span className="topic-text">{truncateText(topic)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="App">
        <h1>India's AI</h1>
        
        <details className="language-selector">
          <summary>Select Language: {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}</summary>
          <div className="language-options">
            <div 
              className={`language-option ${selectedLanguage === "english" ? "selected" : ""}`} 
              onClick={() => changeLanguage("english")}
            >
              English
            </div>
            <div 
              className={`language-option ${selectedLanguage === "hindi" ? "selected" : ""}`} 
              onClick={() => changeLanguage("hindi")}
            >
              Hindi
            </div>
            <div 
              className={`language-option ${selectedLanguage === "marathi" ? "selected" : ""}`} 
              onClick={() => changeLanguage("marathi")}
            >
              Marathi
            </div>
          </div>
        </details>
        
        {currentTopic && (
          <div className="topic-indicator">
            <div className="topic-header">Current topic:</div> 
            <div className="topic-content">{currentTopic}</div>
            <button onClick={startNewTopic} className="small-btn">New Topic</button>
          </div>
        )}
        
        <div className="chat-container">
          <div className="response-container" ref={responseContainerRef}>
            {showResponse && (
              <>
                {responses.map((responseText, index) => (
                  <div key={index} className="response">
                    <p className="response-content">{responseText}</p>
                    {index < responses.length - 1 && <hr className="response-divider" />}
                  </div>
                ))}
              </>
            )}
          </div>
          
          <div className="input-section">
            <div className="input-container">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentTopic ? `Continue discussing or ask a new question...` : "Type your message here..."}
                disabled={isLoading}
              />
              <button onClick={sendToGroq} disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
