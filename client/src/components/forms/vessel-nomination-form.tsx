import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertVesselSchema } from "@/lib/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import FileUpload from "@/components/ui/file-upload";
import { CARGO_TYPES, COUNTRIES, PORTS } from "@/lib/constants";
import { Plus, Trash2 } from "lucide-react";

const vesselFormSchema = insertVesselSchema.extend({
  eta: z.string().optional(),
});

type VesselFormData = z.infer<typeof vesselFormSchema>;

// Types for multiple LCs and loading ports
interface VesselLC {
  lcId: number;
  quantity: number;
  notes?: string;
}

interface LoadingPort {
  portName: string;
  portCode?: string;
  country?: string;
  loadingDate?: string;
  expectedQuantity: number;
  loadingStatus: string;
  notes?: string;
}

interface VesselNominationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  contracts: any[];
  lcs: any[];
  vessel?: any;
}

export default function VesselNominationForm({ onSuccess, onCancel, contracts, lcs, vessel }: VesselNominationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [vesselLCs, setVesselLCs] = useState<VesselLC[]>(
    vessel ? [] : [{ lcId: 0, quantity: 0, notes: '' }]
  );
  const [loadingPorts, setLoadingPorts] = useState<LoadingPort[]>([{ 
    portName: '', 
    expectedQuantity: 0, 
    loadingStatus: 'pending' 
  }]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<VesselFormData>({
    resolver: zodResolver(vesselFormSchema),
    defaultValues: vessel ? {
      ...vessel,
      eta: vessel.eta ? new Date(vessel.eta).toISOString().slice(0, 16) : '',
    } : {
      status: "nominated"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: VesselFormData) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add file if selected
      if (selectedFiles.length > 0) {
        formData.append('instructionsFile', selectedFiles[0]);
      }

      const url = vessel ? `/api/vessels/${vessel.id}` : "/api/vessels";
      const method = vessel ? "PUT" : "POST";
      
        const response = await apiRequest(method, url, formData);

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const createdVessel = await response.json();

      // Create/update vessel LCs if any
      if (vesselLCs.length > 0) {
        const vesselId = vessel ? vessel.id : createdVessel.id;
        for (const vesselLC of vesselLCs) {
          if (vesselLC.lcId > 0) {
            await apiRequest("POST", `/api/vessels/${vesselId}/letters-of-credit`, vesselLC);
          }
        }
      }

      // Create/update loading ports
      if (loadingPorts.length > 0) {
        const vesselId = vessel ? vessel.id : createdVessel.id;
        for (const port of loadingPorts) {
          if (port.portName.trim()) {
            await apiRequest("POST", `/api/vessels/${vesselId}/loading-ports`, port);
          }
        }
      }

      return createdVessel;
    },
    onSuccess: () => {
      // Remove all vessel-related queries from cache completely
      queryClient.removeQueries({ queryKey: ["/api/vessels"] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/vessels" });
      queryClient.removeQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Also invalidate LC queries to refresh allocated quantities
      queryClient.removeQueries({ queryKey: ["/api/letters-of-credit"] });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === "/api/letters-of-credit" });
      
      toast({
        title: "Success",
        description: vessel ? "Vessel updated successfully" : "Vessel nominated successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: vessel ? "Failed to update vessel" : "Failed to nominate vessel",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VesselFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Vessel LCs to assign:", vesselLCs);
    console.log("Loading ports to assign:", loadingPorts);
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="vesselName">Vessel Name *</Label>
              <Input
                id="vesselName"
                {...register("vesselName")}
                placeholder="MV Atlantic Trader"
                className={errors.vesselName ? "border-red-500" : ""}
              />
              {errors.vesselName && (
                <p className="text-sm text-red-500 mt-1">{errors.vesselName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="contractId">Related Contract *</Label>
              <Select 
                onValueChange={(value) => setValue("contractId", parseInt(value))}
                defaultValue={vessel?.contractId?.toString()}
              >
                <SelectTrigger className={errors.contractId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id.toString()}>
                      CON-{contract.id.toString().padStart(3, '0')} - {contract.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contractId && (
                <p className="text-sm text-red-500 mt-1">{errors.contractId.message}</p>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="quantity">Quantity (tons) *</Label>
              <Input
                id="quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
                placeholder="1000"
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cargoType">Cargo Type *</Label>
              <Select 
                onValueChange={(value) => setValue("cargoType", value)}
                defaultValue={vessel?.cargoType}
              >
                <SelectTrigger className={errors.cargoType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select cargo type" />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_TYPES.map((cargo) => (
                    <SelectItem key={cargo.value} value={cargo.value}>{cargo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cargoType && (
                <p className="text-sm text-red-500 mt-1">{errors.cargoType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <Label htmlFor="countryOfOrigin">Country of Origin *</Label>
              <Select 
                onValueChange={(value) => setValue("countryOfOrigin", value)}
                defaultValue={vessel?.countryOfOrigin}
              >
                <SelectTrigger className={errors.countryOfOrigin ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.countryOfOrigin && (
                <p className="text-sm text-red-500 mt-1">{errors.countryOfOrigin.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <Label htmlFor="portOfDischarge">Port of Discharge *</Label>
              <Select 
                onValueChange={(value) => setValue("portOfDischarge", value)}
                defaultValue={vessel?.portOfDischarge}
              >
                <SelectTrigger className={errors.portOfDischarge ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select port" />
                </SelectTrigger>
                <SelectContent>
                  {PORTS.map((port) => (
                    <SelectItem key={port} value={port}>{port}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.portOfDischarge && (
                <p className="text-sm text-red-500 mt-1">{errors.portOfDischarge.message}</p>
              )}
            </div>
          </div>

          {/* Letters of Credit Section */}
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Letters of Credit
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVesselLCs([...vesselLCs, { lcId: 0, quantity: 0, notes: '' }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add LC
                </Button>
                {vesselLCs.length === 0 && vessel && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setVesselLCs([{ lcId: 0, quantity: 0, notes: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First LC
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vesselLCs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No letters of credit added yet. Click "Add LC" to start.</p>
              ) : (
                <div className="space-y-4">
                  {vesselLCs.map((vesselLC, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label>Letter of Credit</Label>
                        <Select 
                          value={vesselLC.lcId.toString()}
                          onValueChange={(value) => {
                            const updated = [...vesselLCs];
                            updated[index].lcId = parseInt(value);
                            setVesselLCs(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select LC" />
                          </SelectTrigger>
                          <SelectContent>
                            {lcs.map((lc) => (
                              <SelectItem key={lc.id} value={lc.id.toString()}>
                                {lc.lcNumber} - {lc.issuingBank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity (tons)</Label>
                        <Input
                          type="number"
                          value={vesselLC.quantity}
                          onChange={(e) => {
                            const updated = [...vesselLCs];
                            updated[index].quantity = parseInt(e.target.value) || 0;
                            setVesselLCs(updated);
                          }}
                          placeholder="1000"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input
                          value={vesselLC.notes || ''}
                          onChange={(e) => {
                            const updated = [...vesselLCs];
                            updated[index].notes = e.target.value;
                            setVesselLCs(updated);
                          }}
                          placeholder="Optional notes"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = vesselLCs.filter((_, i) => i !== index);
                            setVesselLCs(updated);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading Ports Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Loading Ports
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLoadingPorts([...loadingPorts, { 
                    portName: '', 
                    expectedQuantity: 0, 
                    loadingStatus: 'pending' 
                  }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Port
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingPorts.map((port, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label>Port Name</Label>
                      <Input
                        value={port.portName}
                        onChange={(e) => {
                          const updated = [...loadingPorts];
                          updated[index].portName = e.target.value;
                          setLoadingPorts(updated);
                        }}
                        placeholder="Port of Shanghai"
                      />
                    </div>
                    <div>
                      <Label>Port Code</Label>
                      <Input
                        value={port.portCode || ''}
                        onChange={(e) => {
                          const updated = [...loadingPorts];
                          updated[index].portCode = e.target.value;
                          setLoadingPorts(updated);
                        }}
                        placeholder="CNSHA"
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Select 
                        value={port.country || ''}
                        onValueChange={(value) => {
                          const updated = [...loadingPorts];
                          updated[index].country = value;
                          setLoadingPorts(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Expected Quantity</Label>
                      <Input
                        type="number"
                        value={port.expectedQuantity}
                        onChange={(e) => {
                          const updated = [...loadingPorts];
                          updated[index].expectedQuantity = parseInt(e.target.value) || 0;
                          setLoadingPorts(updated);
                        }}
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <Label>Loading Date</Label>
                      <Input
                        type="datetime-local"
                        value={port.loadingDate || ''}
                        onChange={(e) => {
                          const updated = [...loadingPorts];
                          updated[index].loadingDate = e.target.value;
                          setLoadingPorts(updated);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (loadingPorts.length > 1) {
                            const updated = loadingPorts.filter((_, i) => i !== index);
                            setLoadingPorts(updated);
                          }
                        }}
                        disabled={loadingPorts.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="eta">Estimated Time of Arrival (ETA) *</Label>
            <Input
              id="eta"
              type="datetime-local"
              {...register("eta")}
              className={errors.eta ? "border-red-500" : ""}
            />
            {errors.eta && (
              <p className="text-sm text-red-500 mt-1">{errors.eta.message}</p>
            )}
          </div>

          {/* Trade Terms Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Trade Terms & Companies</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div>
                <Label htmlFor="tradeTerms">Trade Terms *</Label>
                <Select 
                  onValueChange={(value) => setValue("tradeTerms", value)}
                  defaultValue={vessel?.tradeTerms || "FOB"}
                >
                  <SelectTrigger className={errors.tradeTerms ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select trade terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                    <SelectItem value="CIF">CIF (Cost, Insurance, and Freight)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tradeTerms && (
                  <p className="text-sm text-red-500 mt-1">{errors.tradeTerms.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="insuranceCompany">Insurance Company *</Label>
                <Input
                  id="insuranceCompany"
                  {...register("insuranceCompany")}
                  placeholder="ABC Insurance Ltd"
                  className={errors.insuranceCompany ? "border-red-500" : ""}
                />
                {errors.insuranceCompany && (
                  <p className="text-sm text-red-500 mt-1">{errors.insuranceCompany.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="inspectionCompany">Inspection Company *</Label>
                <Input
                  id="inspectionCompany"
                  {...register("inspectionCompany")}
                  placeholder="SGS Inspection Services"
                  className={errors.inspectionCompany ? "border-red-500" : ""}
                />
                {errors.inspectionCompany && (
                  <p className="text-sm text-red-500 mt-1">{errors.inspectionCompany.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="shippingCompany">Shipping Company *</Label>
                <Input
                  id="shippingCompany"
                  {...register("shippingCompany")}
                  placeholder="Maersk Line"
                  className={errors.shippingCompany ? "border-red-500" : ""}
                />
                {errors.shippingCompany && (
                  <p className="text-sm text-red-500 mt-1">{errors.shippingCompany.message}</p>
                )}
              </div>
            </div>

            {/* FOB Costs - only show when FOB is selected */}
            {watch("tradeTerms") === "FOB" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-3">FOB Additional Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="insuranceCost">Insurance Cost (USD)</Label>
                    <Input
                      id="insuranceCost"
                      type="number"
                      step="0.01"
                      {...register("insuranceCost")}
                      placeholder="5000.00"
                      className={errors.insuranceCost ? "border-red-500" : ""}
                    />
                    {errors.insuranceCost && (
                      <p className="text-sm text-red-500 mt-1">{errors.insuranceCost.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="inspectionCost">Inspection Cost (USD)</Label>
                    <Input
                      id="inspectionCost"
                      type="number"
                      step="0.01"
                      {...register("inspectionCost")}
                      placeholder="2500.00"
                      className={errors.inspectionCost ? "border-red-500" : ""}
                    />
                    {errors.inspectionCost && (
                      <p className="text-sm text-red-500 mt-1">{errors.inspectionCost.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shippingCost">Shipping Cost (USD)</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      step="0.01"
                      {...register("shippingCost")}
                      placeholder="15000.00"
                      className={errors.shippingCost ? "border-red-500" : ""}
                    />
                    {errors.shippingCost && (
                      <p className="text-sm text-red-500 mt-1">{errors.shippingCost.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="shippingInstructions">Shipping Instructions</Label>
            <Textarea
              id="shippingInstructions"
              {...register("shippingInstructions")}
              rows={4}
              placeholder="Special handling instructions, cargo details, loading requirements..."
            />
          </div>

          <div>
            <Label>Shipping Instructions Document</Label>
            <FileUpload
              accept=".pdf,.doc,.docx"
              onFileSelect={setSelectedFiles}
              existingFile={vessel?.instructionsFile}
              description="PDF, DOC, DOCX up to 5MB"
            />
          </div>



          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setValue("status", "nominated")}
              disabled={createMutation.isPending}
            >
              Save Draft
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-500 hover:bg-purple-600 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Processing..." : (vessel ? "Update Vessel" : "Nominate Vessel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
