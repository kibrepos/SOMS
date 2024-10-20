import "./chatcss/Chat.css";

const Chat = () => {
    return (
        <div className='Chat'>
            <div className="top">
            <div className="user">
                <img src="./avatar.png" alt="" />
                <div className="texts">
                <span>Jane Doe</span>
                <p>Lorem Ipsum dolor, sit amet.</p>
                </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt="" />
                    <img src="./video.png" alt="" />
                    <img src="./info.png" alt="" />
                </div>
                </div>
            <div className="center"></div>
            <div className="bottom">
                <div className="icons">
                    <img src="" alt="" />
                    <img src="" alt="" />
                    <img src="" alt="" />
                </div>
                    <input type="text" placeholder="Type a message..." />
                <div className="emoji">

                </div>
                
            </div>
        </div>
    )
}

export default Chat;