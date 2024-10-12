import "./chatcss/ChatApp.css"
import Chat from './Chat';
import List from './List';
import Detail from "./Detail";
import Header from "../Header";


const ChatApp = () => {
  return (
    <div className='main'>
      <Header/>
      <div className='container'>
      <List/>
      <Chat/>
      <Detail/>
      </div>
    </div>
  );
}

export default ChatApp;
