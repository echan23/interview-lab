import axios from "axios";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ArrowRight } from "lucide-react";

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
const domainName = import.meta.env.VITE_DOMAIN_NAME as string;

const CreateRoomButton = () => {
  const navigate = useNavigate();
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = () => {
    setCaptchaVisible(true);
  };

  const handleCaptchaChange = async (token: string | null) => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${domainName}/api/room/create`, {
        captchaToken: token,
      });
      navigate(`/lab/${data.roomID}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <Button
        onClick={handleCreateRoom}
        disabled={loading}
        className="
          group relative
          flex items-center justify-center gap-3
          h-14 px-8
          bg-white text-black
          font-display font-semibold text-base
          rounded-full
          border-0
          shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.2)]
          transition-all duration-300 ease-out
          hover:bg-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(255,255,255,0.1)]
          hover:scale-[1.02]
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        "
      >
        <span>{loading ? "Creating..." : "Create Lab"}</span>
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Button>

      <div className="h-[78px] w-full flex justify-center">
        <div
          className="transition-all duration-300"
          style={{
            opacity: captchaVisible ? 1 : 0,
            visibility: captchaVisible ? "visible" : "hidden",
            transform: captchaVisible ? "translateY(0)" : "translateY(-8px)",
          }}
        >
          <ReCAPTCHA sitekey={siteKey} onChange={handleCaptchaChange} theme="dark" />
        </div>
      </div>
    </div>
  );
};

export default CreateRoomButton;
