import type {Metadata} from "next";
import {AccountScreen} from "@/components/account-screen";
export const metadata:Metadata={title:"Daftar",robots:{index:false,follow:false}};
export default function SignUpPage(){return <AccountScreen mode="signup"/>}
