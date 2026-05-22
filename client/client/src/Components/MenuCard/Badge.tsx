import "./Badge.css"
const Badge:React.FC<{state:boolean}> = ({state})=>{

    return (
        <span className={`Badge-cntr ${state? "active":"inactive"}`}>
            {state? "Active":"Inactive" }
        </span>
    )
}

export default Badge;