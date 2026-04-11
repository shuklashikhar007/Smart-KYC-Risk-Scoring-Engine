import { Link } from "react-router";

export default function NotFound() {
    return (
        <div className="flex flex-1 flex-col relative w-full text-text-light font-display">
            {/* main body */}
            <main className="flex flex-1 flex-col justify-center items-center">
                <span className="animate-bounce">not found...</span>
                <Link to="/" className="underline underline-offset-2 text-green-900">
                    go back
                </Link>
            </main>
        </div>
    );
}
